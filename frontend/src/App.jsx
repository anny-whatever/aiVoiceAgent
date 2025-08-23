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

        // Establish session config, including tools + tool_choice
        sendSessionUpdate(dc, {
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            silence_duration_ms: 600,
          },
          modalities: ["text", "audio"],
          voice: "alloy",
          tool_choice: "auto",
          tools: [
            {
              type: "function",
              name: "get_driving_data",
              description: "Get personal trip data and insights",
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
                  },
                  query: { type: "string" },
                },
                required: ["category", "query"],
              },
            },
          ],
          instructions:
            "You are Drival, a personal driving assistant. Be brief and conversational.",
        });

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
      event.type.includes("function_call")
    ) {
      console.log("📨", event.type, event);
    }

    switch (event.type) {
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
        if (event.name === "get_driving_data") {
          try {
            const args = JSON.parse(event.arguments || "{}");
            const r = await fetch(`${BACKEND_URL}/api/tools/get_driving_data`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(args),
            });
            if (!r.ok) throw new Error(await r.text());
            const { content } = await r.json();

            // 1) deliver function result
            if (dcRef.current) {
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
            console.error("Tool error:", e);
            if (dcRef.current) {
              sendFunctionResult(
                dcRef.current,
                event.call_id,
                "Sorry, I couldn't retrieve that right now."
              );
              sendResponseCreate(dcRef.current);
            }
          }
        }
        break;
      }

      case "response.done":
        if (event.response?.status === "failed") {
          console.error("❌ Response failed", event.response?.status_details);
          setStatus("Model error. You can speak again.");
        }
        break;

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
