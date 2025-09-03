import { ApiService } from "./api";
import {
  sendFunctionResult,
  sendResponseCreate,
  sendSessionUpdate,
} from "../webrtc";
import { EventHandlerArgs } from "../types";

export class RealtimeEventHandler {
  private args: EventHandlerArgs;

  constructor(args: EventHandlerArgs) {
    this.args = args;
  }

  async handleEvent(event: any) {
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
        this.args.setIsListening(true);
        this.args.setStatus("Listening...");
        this.args.userDing();
        break;

      case "input_audio_buffer.speech_stopped":
        this.args.setIsListening(false);
        this.args.setStatus("Processing...");
        break;

      case "output_audio_buffer.started":
        this.args.setIsAISpeaking(true);
        this.args.setStatus("AI speaking…");
        // Mute microphone during AI speech
        if (this.args.micRef.current) {
          this.args.micRef.current.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
        }
        this.args.aiDing();
        break;

      case "output_audio_buffer.stopped":
        this.args.setIsAISpeaking(false);
        this.args.setStatus("Ready");
        // Re-enable microphone after AI finishes
        if (this.args.micRef.current) {
          this.args.micRef.current.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
        }
        setTimeout(this.args.userDing, 250);
        break;

      case "response.function_call_arguments.done":
        await this.handleFunctionCall(event);
        break;

      case "response.done":
        await this.handleResponseDone(event);
        break;

      case "error":
        console.error("❌ Realtime error:", event.error);
        console.error("❌ Full error event:", event);
        this.args.setStatus(`Error: ${event.error?.message || "Unknown"}`);
        break;
    }
  }

  private async handleFunctionCall(event: any) {
    console.log(
      "📞 Function call received:",
      event.name,
      "Args:",
      event.arguments,
      "Call ID:",
      event.call_id
    );

    if (!event.call_id) {
      console.error("❌ Missing call_id in function call event:", event);
      return;
    }

    if (event.name === "get_driving_data") {
      await this.handleDrivingDataCall(event);
    } else if (event.name === "assess_user_mood") {
      await this.handleMoodAssessmentCall(event);
    } else if (event.name === "get_vehicle_info") {
      await this.handleVehicleInfoCall(event);
    } else if (event.name === "get_user_info") {
      await this.handleUserInfoCall(event);
    } else if (event.name === "search_web") {
      await this.handleSearchWebCall(event);
    } else if (event.name === "analyze_image") {
      await this.handleAnalyzeImageCall(event);
    } else {
      console.warn("⚠️ Unknown function call:", event.name);
    }
  }

  private async handleDrivingDataCall(event: any) {
    try {
      const args = JSON.parse(event.arguments || "{}");
      args.userId = this.args.selectedUser;
      console.log("🔍 Calling backend with args:", args);

      const result = await ApiService.getDrivingData(args);
      console.log("✅ Backend response:", result);

      if (this.args.dcRef.current) {
        console.log("📤 Sending function result back to model");
        // Send both content and trip data to AI for proper description
        const functionOutput = {
          message: result.content || "No data found",
          trips: result.data || []
        };
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          JSON.stringify(functionOutput)
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log("📤 Triggering model response after function result");
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    } catch (error) {
      console.error("❌ Tool execution error:", error);
      if (this.args.dcRef.current) {
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          `Sorry, I couldn't retrieve that data. Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log(
              "📤 Triggering model response after error function result"
            );
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    }
  }

  private async handleMoodAssessmentCall(event: any) {
    try {
      const args = JSON.parse(event.arguments || "{}");
      args.userId = this.args.selectedUser;
      args.sessionId = `session-${Date.now()}-${this.args.selectedUser}`;
      
      // Check if the user response contains visual questions
      const visualKeywords = [
        'see', 'look', 'watch', 'observe', 'view', 'notice', 'spot', 'wearing', 'color', 'shirt', 'clothes', 'clothing',
        'appearance', 'visible', 'show', 'display', 'what am i', 'what do you see', 'can you see', 'do you see',
        'how do i look', 'what color', 'what\'s on', 'describe what', 'tell me what you see'
      ];
      
      const containsVisualQuestion = visualKeywords.some(keyword => 
        args.userResponse?.toLowerCase().includes(keyword.toLowerCase())
      );

      // Capture image if visual question is detected and video is available
      if (containsVisualQuestion && this.args.videoMoodRef?.current) {
        console.log("🔍 Visual question detected, capturing image...");
        
        try {
          const captureResult = this.args.videoMoodRef.current.captureImage({
            quality: 0.8,
            format: 'jpeg'
          });
          
          if (captureResult.success && captureResult.imageData) {
            args.imageData = captureResult.imageData;
            console.log("📸 Image captured for mood assessment");
          } else {
            console.warn("⚠️ Failed to capture image:", captureResult.error);
          }
        } catch (captureError) {
          console.error("❌ Image capture error:", captureError);
        }
      }
      
      const result = await ApiService.assessUserMood(args);

      // Update mood state for UI display
      if (result.assessment) {
        this.args.setCurrentMood(result.assessment.mood);
        this.args.setMoodConfidence(result.assessment.confidence);
      }

      // Update session with mood-based instructions if provided
      if (result.instructions && this.args.dcRef.current) {
        setTimeout(() => {
          if (this.args.dcRef.current) {
            this.args.sendSessionUpdate(this.args.dcRef.current, {
              instructions: result.instructions,
            });
          }
        }, 200);
      }

      if (this.args.dcRef.current) {
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          result.content || "Mood assessed successfully"
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
    
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    } catch (error) {
      console.error("❌ Mood assessment error:", error);
      if (this.args.dcRef.current) {
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          `I had trouble assessing your mood, but I'm here to help! Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log(
              "📤 Triggering model response after mood assessment error"
            );
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    }
  }

  private async handleVehicleInfoCall(event: any) {
    try {
      const args = JSON.parse(event.arguments || "{}");
      args.userId = this.args.selectedUser;
      console.log("🚗 Calling backend for vehicle info with args:", args);

      const result = await ApiService.getVehicleInfo(args);
      console.log("✅ Vehicle info response:", result);

      if (this.args.dcRef.current) {
        console.log("📤 Sending vehicle info result back to model");
        // Send both content and vehicle data to AI for proper description
        const functionOutput = {
          message: result.content || "No vehicle information found",
          vehicles: result.data || []
        };
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          JSON.stringify(functionOutput)
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log("📤 Triggering model response after vehicle info result");
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    } catch (error) {
      console.error("❌ Vehicle info error:", error);
      if (this.args.dcRef.current) {
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          `Sorry, I couldn't retrieve your vehicle information. Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log(
              "📤 Triggering model response after vehicle info error"
            );
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    }
  }

  private async handleUserInfoCall(event: any) {
    try {
      const args = JSON.parse(event.arguments || "{}");
      args.userId = this.args.selectedUser;
      console.log("👤 Calling backend for user info with args:", args);

      const result = await ApiService.getUserInfo(args);
      console.log("✅ User info response:", result);

      if (this.args.dcRef.current) {
        console.log("📤 Sending user info result back to model");
        // Send both content and user data to AI for proper description
        const functionOutput = {
          message: result.content || "No user information found",
          userInfo: result.data || {}
        };
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          JSON.stringify(functionOutput)
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log("📤 Triggering model response after user info result");
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    } catch (error) {
      console.error("❌ User info error:", error);
      if (this.args.dcRef.current) {
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          `Sorry, I couldn't retrieve your user information. Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log(
              "📤 Triggering model response after user info error"
            );
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    }
  }

  private async handleSearchWebCall(event: any) {
    try {
      const args = JSON.parse(event.arguments || "{}");
      console.log("🔍 Calling backend for web search with args:", args);

      const result = await ApiService.searchWeb(args);
      console.log("✅ Search web response:", result);

      if (this.args.dcRef.current) {
        console.log("📤 Sending search result back to model");
        
        // Send the search result content to AI
        const searchData = result.data || {};
        const functionOutput = {
          success: searchData.success || false,
          content: result.content || searchData.summary || "No search results found",
          summary: searchData.summary || "",
          hasMoreDetails: searchData.metadata?.hasMoreDetails || false,
          references: searchData.references || [],
          query: args.query || ""
        };
        
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          JSON.stringify(functionOutput)
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log("📤 Triggering model response after search result");
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    } catch (error) {
      console.error("❌ Search web error:", error);
      if (this.args.dcRef.current) {
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          `Sorry, I couldn't perform the web search. Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log(
              "📤 Triggering model response after search error"
            );
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    }
  }

  private async handleAnalyzeImageCall(event: any) {
    try {
      const args = JSON.parse(event.arguments || "{}");
      console.log("🖼️ Calling backend for image analysis with args:", args);

      const result = await ApiService.analyzeImage(args);
      console.log("✅ Image analysis response:", result);

      if (this.args.dcRef.current) {
        console.log("📤 Sending image analysis result back to model");
        
        // Send the analysis result to AI
        const functionOutput = {
          success: result.success || false,
          content: result.content || "I couldn't analyze the image.",
          analysis: result.data?.analysis || "",
          context: result.data?.context || null,
          timestamp: result.data?.timestamp || new Date().toISOString()
        };
        
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          JSON.stringify(functionOutput)
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log("📤 Triggering model response after image analysis");
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    } catch (error) {
      console.error("❌ Image analysis error:", error);
      if (this.args.dcRef.current) {
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          `Sorry, I couldn't analyze the image. Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log(
              "📤 Triggering model response after image analysis error"
            );
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    }
  }

  private async handleResponseDone(event: any) {
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

      // Handle server error retries (this logic from the original was complex, keeping simplified)
      if (errType === "server_error" && this.args.dcRef.current) {
        this.args.setStatus("Server error — retrying once…");
        setTimeout(() => {
          if (this.args.dcRef.current) {
            this.args.sendResponseCreate(this.args.dcRef.current, {
              modalities: ["audio", "text"],
              max_output_tokens: 900,
            });
          }
        }, 300);
      } else {
        this.args.setStatus(
          `Model error: ${
            errMessage || errType || "Unknown"
          }. You can speak again.`
        );
      }
    }
  }
}
