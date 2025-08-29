import {
  RTCPeerConnection,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc-web-shim';
import 'react-native-url-polyfill/auto';

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
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  });
  
  const dc = pc.createDataChannel('oai-events');

  dc.addEventListener('message', (e: any) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch {
      // ignore non-JSON control messages
    }
  });

  pc.addEventListener('track', (event: any) => {
    if (event.track) {
      const stream = new MediaStream();
      stream.addTrack(event.track);
      onRemoteTrack(stream);
    }
  });

  // mic
  const mic = await mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
  
  mic.getTracks().forEach((track) => {
    pc.addTrack(track as any, mic);
  });

  // Offer/Answer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // REQUIRED during Realtime beta; missing this can cause late server_error
  const r = await fetch(
    'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
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

  if (!r.ok) {
    throw new Error(`Connection failed: ${r.status} ${await r.text()}`);
  }

  const answerSdp = await r.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  return { pc, dc, mic };
}

/** Convenience helpers for protocol messages */
export function sendSessionUpdate(dc: RTCDataChannel, update: any) {
  dc.send(JSON.stringify({ type: 'session.update', session: update }));
}

export function sendResponseCreate(dc: RTCDataChannel, response?: any) {
  dc.send(
    JSON.stringify({
      type: 'response.create',
      response: response || { modalities: ['audio', 'text'] },
    })
  );
}

export function sendFunctionResult(
  dc: RTCDataChannel,
  callId: string,
  output: string
) {
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