import {
  RTCPeerConnection,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';

export type ConnectOpts = {
  apiKey: string;
  backendUrl: string;
  onEvent: (ev: any) => void;
  onRemoteTrack: (stream: MediaStream) => void;
};

export async function connectRealtime({
  apiKey,
  backendUrl,
  onEvent,
  onRemoteTrack,
}: ConnectOpts) {
  const pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ],
  });
  
  const dc = pc.createDataChannel('oai-events');

  (dc as any).onmessage = (e: any) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch {
      // ignore non-JSON control messages
    }
  };

  (pc as any).ontrack = (evt: any) => {
    console.log('📺 Remote track received:', evt.streams[0]);
    onRemoteTrack(evt.streams[0]);
  };

  // Get microphone access for mobile
  const mic = await mediaDevices.getUserMedia({
    audio: true,
    video: false, // Audio only for voice agent
  });
  
  // Add audio track to peer connection
  mic.getTracks().forEach((track) => {
    pc.addTrack(track, mic);
  });

  // Create offer
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
  });
  await pc.setLocalDescription(offer);

  // Send offer to OpenAI Realtime API
  const response = await fetch(
    'https://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/sdp',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: offer.sdp,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Connection failed: ${response.status} ${errorText}`);
  }

  const answerSdp = await response.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  return { pc, dc, mic };
}

/** Convenience helpers for protocol messages */
export function sendSessionUpdate(dc: any, update: any) {
  if (dc && dc.readyState === 'open') {
    dc.send(JSON.stringify({ type: 'session.update', session: update }));
  }
}

export function sendResponseCreate(dc: any, response?: any) {
  if (dc && dc.readyState === 'open') {
    dc.send(
      JSON.stringify({
        type: 'response.create',
        response: response || { modalities: ['audio', 'text'] },
      })
    );
  }
}

export function sendFunctionResult(
  dc: any,
  callId: string,
  output: string
) {
  if (dc && dc.readyState === 'open') {
    dc.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output,
        },
      })
    );
  }
}

// Mobile-specific utility functions
export async function checkAudioPermissions(): Promise<boolean> {
  try {
    const stream = await mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Audio permission denied:', error);
    return false;
  }
}

export function stopMediaStream(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

export function muteAudioTrack(stream: MediaStream | null, mute: boolean) {
  if (stream) {
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !mute;
    });
  }
}