import { useEffect, useRef, useState } from "react";
import "./index.css";
import {
  connectRealtime,
  sendFunctionResult,
  sendResponseCreate,
  sendSessionUpdate,
} from "./webrtc";

const BACKEND_URL = "http://localhost:3001";

export default function App() {
  const [status, setStatus] = useState("Ready");
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const micRef = useRef(null);
  const audioRef = useRef(null);

  // guard to avoid spamming retries
  const lastFailedResponseIdRef = useRef(null);
  const retriedOnceForResponseRef = useRef({});

  const dingCtxRef = useRef(null);
  const ding = (f = 800, ms = 150) => {
    dingCtxRef.current ??= new (window.AudioContext ||
      window.webkitAudioContext)();
    const osc = dingCtxRef.current.createOscillator();
    const gain = dingCtxRef.current.createGain();
    osc.connect(gain);
    gain.connect(dingCtxRef.current.destination);
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.value = 0.1;
    osc.start();
    setTimeout(() => {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    }, ms);
  };
  const userDing = () => ding(600, 150);
  const aiDing = () => ding(1000, 150);

  async function start() {
    try {
      setStatus("Connecting...");
      const sess = await fetch(`${BACKEND_URL}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!sess.ok) {
        const e = await sess.json().catch(() => ({}));
        throw new Error(e.message || "Session create failed");
      }
      const { apiKey } = await sess.json();

      const { pc, dc, mic } = await connectRealtime({
        apiKey,
        backendUrl: BACKEND_URL,
        onEvent: handleEvent,
        onRemoteTrack: (stream) => {
          if (audioRef.current) {
            audioRef.current.srcObject = stream;
            audioRef.current.play().catch(console.error);
          }
        },
      });

      pcRef.current = pc;
      dcRef.current = dc;
      micRef.current = mic;

      dc.onopen = () => {
        setIsConnected(true);
        setStatus("Connected — say hello!");

        // Try minimal session config first to isolate the issue
        console.log("🔧 Sending basic session update...");
        sendSessionUpdate(dc, {
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            silence_duration_ms: 600,
          },
          modalities: ["text", "audio"],
          voice: "alloy",
          instructions:
            "You are Drival, a personal driving assistant. Be brief and conversational. When users ask about their trips, use the get_driving_data function which returns COMPLETE data for each category (all trips, sorted newest first). Use this complete data to give accurate answers about counts, dates, and latest trips.",
        });

        // Add tools configuration with complete data approach
        setTimeout(() => {
          console.log("🔧 Adding tools configuration...");
          sendSessionUpdate(dc, {
            tool_choice: "auto",
            tools: [
              {
                type: "function",
                name: "get_driving_data",
                description:
                  "Get complete trip data for a category. Returns ALL trips in that category sorted by date (newest first), giving you full context to answer accurately.",
                parameters: {
                  type: "object",
                  properties: {
                    category: {
                      type: "string",
                      enum: [
                        "work_commute",
                        "errands_shopping",
                        "social_visits",
                        "entertainment_dining",
                        "weekend_trips",
                        "medical_appointments",
                        "general",
                      ],
                      description:
                        "Category of trip data to retrieve - you'll get ALL trips in this category",
                    },
                    query: {
                      type: "string",
                      description:
                        "Description of what the user is asking about (the query parameter is required but the function returns complete data regardless)",
                    },
                  },
                  required: ["category", "query"],
                },
              },
            ],
          });
        }, 1000);

        // Initial greeting
        setTimeout(() => sendResponseCreate(dc), 500);
      };
    } catch (e) {
      console.error(e);
      setStatus(`Error: ${e?.message || e}`);
      stop();
    }
  }

  function stop() {
    try {
      dcRef.current?.close();
      pcRef.current?.close();
      micRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    dcRef.current = null;
    pcRef.current = null;
    micRef.current = null;
    setIsAISpeaking(false);
    setIsListening(false);
    setIsConnected(false);
    setStatus("Disconnected");
  }

  async function handleEvent(event) {
    // Log the interesting stuff
    if (
      event.type === "error" ||
      event.type.startsWith("response.") ||
      event.type.includes("function_call") ||
      event.type === "session.updated"
    ) {
      console.log("📨", event.type, event);
    }

    switch (event.type) {
      case "session.updated":
        console.log("✅ Session updated successfully");
        break;

      case "input_audio_buffer.speech_started":
        setIsListening(true);
        setStatus("Listening...");
        userDing();
        break;

      case "input_audio_buffer.speech_stopped":
        setIsListening(false);
        setStatus("Processing...");
        break;

      case "output_audio_buffer.started":
        setIsAISpeaking(true);
        setStatus("AI speaking…");
        aiDing();
        break;

      case "output_audio_buffer.stopped":
        setIsAISpeaking(false);
        setStatus("Ready");
        setTimeout(userDing, 250);
        break;

      case "response.function_call_arguments.done": {
        // Tool call arrived – execute via backend and *immediately* continue
        console.log(
          "📞 Function call received:",
          event.name,
          "Args:",
          event.arguments
        );

        if (event.name === "get_driving_data") {
          try {
            const args = JSON.parse(event.arguments || "{}");
            console.log("🔍 Calling backend with args:", args);

            const r = await fetch(`${BACKEND_URL}/api/tools/get_driving_data`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(args),
            });

            if (!r.ok) {
              const errorText = await r.text();
              console.error(
                "❌ Backend tool call failed:",
                r.status,
                errorText
              );
              throw new Error(`Backend error: ${r.status} - ${errorText}`);
            }

            const result = await r.json();
            console.log("✅ Backend response:", result);
            const { content } = result;

            // 1) deliver function result
            if (dcRef.current) {
              console.log("📤 Sending function result back to model");
              sendFunctionResult(
                dcRef.current,
                event.call_id,
                content || "No data found"
              );
              // 2) immediately tell model to continue
              sendResponseCreate(dcRef.current, {
                modalities: ["audio", "text"],
                max_output_tokens: 300,
              });
            }
          } catch (e) {
            console.error("❌ Tool execution error:", e);
            if (dcRef.current) {
              sendFunctionResult(
                dcRef.current,
                event.call_id,
                `Sorry, I couldn't retrieve that data. Error: ${e.message}`
              );
              sendResponseCreate(dcRef.current);
            }
          }
        } else {
          console.warn("⚠️ Unknown function call:", event.name);
        }
        break;
      }

      case "response.done": {
        // Transient server errors do happen; retry once per failed response id.
        const resp = event.response;
        console.log("🎯 Response completed:", {
          status: resp?.status,
          id: resp?.id,
          usage: resp?.usage,
        });

        if (resp?.status === "failed") {
          const errType = resp?.status_details?.error?.type;
          const errMessage = resp?.status_details?.error?.message;
          const errCode = resp?.status_details?.error?.code;
          const respId = resp?.id || "unknown";

          console.error("❌ FULL Response failure details:", {
            response_id: respId,
            status_details: resp?.status_details,
            full_response: resp,
            error_type: errType,
            error_message: errMessage,
            error_code: errCode,
          });

          if (
            errType === "server_error" &&
            !retriedOnceForResponseRef.current[respId] &&
            dcRef.current
          ) {
            retriedOnceForResponseRef.current[respId] = true;
            lastFailedResponseIdRef.current = respId;
            setStatus("Server error — retrying once…");
            // brief backoff then try to continue again
            setTimeout(() => {
              if (dcRef.current) {
                sendResponseCreate(dcRef.current, {
                  modalities: ["audio", "text"],
                  max_output_tokens: 300,
                });
              }
            }, 300);
          } else {
            setStatus(
              `Model error: ${
                errMessage || errType || "Unknown"
              }. You can speak again.`
            );
          }
        }
        break;
      }

      case "error":
        console.error("Realtime error:", event.error);
        setStatus(`Error: ${event.error?.message || "Unknown"}`);
        break;
    }
  }

  useEffect(() => () => stop(), []);

  return (
    <div className="flex justify-center items-center min-h-screen text-white bg-gray-900">
      <div className="px-6 w-full max-w-md text-center">
        <h1 className="mb-6 text-3xl font-bold text-blue-400">Drival</h1>

        <div className="mb-6">
          <div
            className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition ${
              isAISpeaking
                ? "bg-blue-500"
                : isListening
                ? "bg-green-500"
                : isConnected
                ? "bg-gray-600"
                : "bg-gray-500"
            }`}
          >
            <span className="text-4xl">
              {isAISpeaking
                ? "🤖"
                : isListening
                ? "🎤"
                : isConnected
                ? "💭"
                : "🚗"}
            </span>
          </div>
          <p className="mt-3 text-lg">{status}</p>
        </div>

        {!isConnected ? (
          <button
            onClick={start}
            className="py-3 w-full font-semibold bg-blue-600 rounded hover:bg-blue-700"
          >
            Start Voice Chat
          </button>
        ) : (
          <button
            onClick={stop}
            className="py-3 w-full font-semibold bg-red-600 rounded hover:bg-red-700"
          >
            End Session
          </button>
        )}

        <p className="mt-6 text-sm text-gray-400">
          Ask about driving tips, traffic rules, or your trip history.
        </p>

        <audio ref={audioRef} autoPlay className="hidden" />
      </div>
    </div>
  );
}
