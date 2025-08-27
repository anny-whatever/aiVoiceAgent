import { EventHandlerArgs } from '../types';
import { sendSessionUpdate, sendFunctionResult, sendResponseCreate } from './webrtc';

export class RealtimeEventHandler {
  private args: EventHandlerArgs;

  constructor(args: EventHandlerArgs) {
    this.args = args;
  }

  handleEvent = (event: any) => {
    console.log('📨 Received event:', event.type);

    switch (event.type) {
      case 'session.created':
        this.handleSessionCreated(event);
        break;
      case 'session.updated':
        this.handleSessionUpdated(event);
        break;
      case 'input_audio_buffer.speech_started':
        this.handleSpeechStarted(event);
        break;
      case 'input_audio_buffer.speech_stopped':
        this.handleSpeechStopped(event);
        break;
      case 'response.audio.delta':
        this.handleAudioDelta(event);
        break;
      case 'response.audio.done':
        this.handleAudioDone(event);
        break;
      case 'response.function_call_arguments.delta':
        this.handleFunctionCallDelta(event);
        break;
      case 'response.function_call_arguments.done':
        this.handleFunctionCallDone(event);
        break;
      case 'response.done':
        this.handleResponseDone(event);
        break;
      case 'error':
        this.handleError(event);
        break;
      default:
        console.log('🤷 Unhandled event type:', event.type);
    }
  };

  private handleSessionCreated = (event: any) => {
    console.log('🎉 Session created:', event.session.id);
    this.args.setStatus('Connected');
    
    // Configure session for voice agent
    const sessionUpdate = {
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 200,
      },
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      voice: 'alloy',
      instructions: `You are a helpful AI voice assistant. You can assess the user's mood and provide driving data when requested. Keep responses conversational and natural.`,
      modalities: ['text', 'audio'],
      temperature: 0.8,
      tools: [
        {
          type: 'function',
          name: 'assess_user_mood',
          description: 'Assess the current mood of the user based on their voice and conversation',
          parameters: {
            type: 'object',
            properties: {
              user_id: {
                type: 'string',
                description: 'The ID of the user whose mood to assess'
              }
            },
            required: ['user_id']
          }
        },
        {
          type: 'function',
          name: 'get_driving_data',
          description: 'Get driving-related data and recommendations',
          parameters: {
            type: 'object',
            properties: {
              user_id: {
                type: 'string',
                description: 'The ID of the user requesting driving data'
              }
            },
            required: ['user_id']
          }
        }
      ]
    };

    sendSessionUpdate(this.args.dcRef.current, sessionUpdate);
  };

  private handleSessionUpdated = (event: any) => {
    console.log('🔄 Session updated');
  };

  private handleSpeechStarted = (event: any) => {
    console.log('🎤 Speech started');
    this.args.setIsListening(true);
    this.args.setIsAISpeaking(false);
    this.args.userDing();
  };

  private handleSpeechStopped = (event: any) => {
    console.log('🤐 Speech stopped');
    this.args.setIsListening(false);
  };

  private handleAudioDelta = (event: any) => {
    // Audio delta handling would be implemented here
    // For now, we just track that AI is speaking
    this.args.setIsAISpeaking(true);
    this.args.aiDing();
  };

  private handleAudioDone = (event: any) => {
    console.log('🔊 Audio response complete');
    this.args.setIsAISpeaking(false);
  };

  private handleFunctionCallDelta = (event: any) => {
    console.log('🔧 Function call delta:', event.delta);
  };

  private handleFunctionCallDone = (event: any) => {
    console.log('🔧 Function call done:', event.name, event.arguments);
    
    try {
      const args = JSON.parse(event.arguments);
      
      if (event.name === 'assess_user_mood') {
        this.handleMoodAssessment(event.call_id, args.user_id);
      } else if (event.name === 'get_driving_data') {
        this.handleDrivingDataCall(event.call_id, args.user_id);
      }
    } catch (error) {
      console.error('Error parsing function arguments:', error);
      sendFunctionResult(
        this.args.dcRef.current,
        event.call_id,
        JSON.stringify({ error: 'Invalid function arguments' })
      );
    }
  };

  private handleResponseDone = (event: any) => {
    console.log('✅ Response complete');
    this.args.setIsAISpeaking(false);
  };

  private handleError = (event: any) => {
    console.error('❌ Error:', event.error);
    this.args.setStatus(`Error: ${event.error.message || 'Unknown error'}`);
  };

  private handleMoodAssessment = async (callId: string, userId: string) => {
    try {
      console.log('🎭 Assessing mood for user:', userId);
      
      const response = await fetch(`${this.args.backendUrl}/api/assess-mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.assessment) {
        this.args.setCurrentMood(result.assessment.mood);
        this.args.setMoodConfidence(result.assessment.confidence);
      }

      sendFunctionResult(
        this.args.dcRef.current,
        callId,
        JSON.stringify(result)
      );
    } catch (error) {
      console.error('Error assessing mood:', error);
      sendFunctionResult(
        this.args.dcRef.current,
        callId,
        JSON.stringify({ error: 'Failed to assess mood' })
      );
    }
  };

  private handleDrivingDataCall = async (callId: string, userId: string) => {
    try {
      console.log('🚗 Getting driving data for user:', userId);
      
      const response = await fetch(`${this.args.backendUrl}/api/driving-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      sendFunctionResult(
        this.args.dcRef.current,
        callId,
        JSON.stringify(result)
      );
    } catch (error) {
      console.error('Error getting driving data:', error);
      sendFunctionResult(
        this.args.dcRef.current,
        callId,
        JSON.stringify({ error: 'Failed to get driving data' })
      );
    }
  };
}