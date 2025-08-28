import { ApiService } from './api';
import {
  sendFunctionResult,
  sendResponseCreate,
  sendSessionUpdate,
} from './webrtc';
import { EventHandlerArgs } from '../types';

export class RealtimeEventHandler {
  private args: EventHandlerArgs;

  constructor(args: EventHandlerArgs) {
    this.args = args;
  }

  async handleEvent(event: any) {
    // Log the interesting stuff
    if (
      event.type === 'error' ||
      event.type.startsWith('response.') ||
      event.type.includes('function_call') ||
      event.type === 'session.updated'
    ) {
      console.log('📨', event.type, event);
    }

    switch (event.type) {
      case 'session.updated':
        console.log('✅ Session updated successfully');
        break;

      case 'input_audio_buffer.speech_started':
        this.args.setIsListening(true);
        this.args.setStatus('Listening...');
        this.args.userDing();
        break;

      case 'input_audio_buffer.speech_stopped':
        this.args.setIsListening(false);
        this.args.setStatus('Processing...');
        break;

      case 'output_audio_buffer.started':
        this.args.setIsAISpeaking(true);
        this.args.setStatus('AI speaking…');
        // Mute microphone during AI speech
        if (this.args.micRef.current) {
          this.args.micRef.current.getAudioTracks().forEach((track: any) => {
            track.enabled = false;
          });
        }
        this.args.aiDing();
        break;

      case 'output_audio_buffer.stopped':
        this.args.setIsAISpeaking(false);
        this.args.setStatus('Ready');
        // Re-enable microphone after AI finishes
        if (this.args.micRef.current) {
          this.args.micRef.current.getAudioTracks().forEach((track: any) => {
            track.enabled = true;
          });
        }
        break;

      case 'response.function_call_arguments.done':
        console.log('🔧 Function call completed:', event);
        if (event.name === 'get_driving_data') {
          await this.handleDrivingDataCall(event);
        } else if (event.name === 'assess_user_mood') {
          await this.handleMoodAssessmentCall(event);
        }
        break;

      case 'error':
        console.error('❌ OpenAI Realtime error:', event);
        this.args.setStatus(`Error: ${event.error?.message || 'Unknown error'}`);
        break;

      case 'response.done':
        console.log('✅ Response completed');
        break;

      default:
        // Ignore other event types
        break;
    }
  }

  private async handleDrivingDataCall(event: any) {
    try {
      const args = JSON.parse(event.arguments || '{}');
      args.userId = this.args.selectedUser;
      console.log('🔍 Calling backend with args:', args);

      const result = await ApiService.getDrivingData(args);
      console.log('✅ Backend response:', result);

      if (this.args.dcRef.current) {
        console.log('📤 Sending function result back to model');
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          result.content || 'No data found'
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log('📤 Triggering model response after function result');
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    } catch (error) {
      console.error('❌ Tool execution error:', error);
      if (this.args.dcRef.current) {
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          `Sorry, I couldn't retrieve that data. Error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log(
              '📤 Triggering model response after error function result'
            );
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    }
  }

  private async handleMoodAssessmentCall(event: any) {
    try {
      const args = JSON.parse(event.arguments || '{}');
      args.userId = this.args.selectedUser;
      args.sessionId = `session-${Date.now()}-${this.args.selectedUser}`;
      console.log('🧠 Calling mood assessment with args:', args);

      const result = await ApiService.assessUserMood(args);
      console.log('✅ Mood assessment result:', result);

      // Update mood state for UI display
      if (result.assessment) {
        this.args.setCurrentMood(result.assessment.mood);
        this.args.setMoodConfidence(result.assessment.confidence);
      }

      // Update session with mood-based instructions if provided
      if (result.instructions && this.args.dcRef.current) {
        console.log('🔄 Updating session with mood-based instructions');
        setTimeout(() => {
          if (this.args.dcRef.current) {
            this.args.sendSessionUpdate(this.args.dcRef.current, {
              instructions: result.instructions,
            });
          }
        }, 200);
      }

      if (this.args.dcRef.current) {
        console.log('📤 Sending mood assessment result back to model');
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          result.content || 'Mood assessed successfully'
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log('📤 Triggering model response after mood assessment');
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    } catch (error) {
      console.error('❌ Mood assessment error:', error);
      if (this.args.dcRef.current) {
        this.args.sendFunctionResult(
          this.args.dcRef.current,
          event.call_id,
          `I had trouble assessing your mood, but I'm here to help! Error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );

        setTimeout(() => {
          if (this.args.dcRef.current) {
            console.log(
              '📤 Triggering model response after mood assessment error'
            );
            this.args.sendResponseCreate(this.args.dcRef.current);
          }
        }, 100);
      }
    }
  }
}