declare module 'react-native-webrtc-web-shim' {
  export class RTCPeerConnection {
    constructor(configuration?: any);
    createDataChannel(label: string, options?: any): RTCDataChannel;
    addTrack(track: any, stream?: any): void;
    createOffer(options?: any): Promise<RTCSessionDescriptionInit>;
    setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
    setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
    addEventListener(type: string, listener: (event: any) => void): void;
    close(): void;
  }

  export class RTCDataChannel {
    send(data: string): void;
    close(): void;
    addEventListener(type: string, listener: (event: any) => void): void;
  }

  export class MediaStream {
    constructor();
    addTrack(track: any): void;
    getTracks(): any[];
    getAudioTracks(): any[];
    getVideoTracks(): any[];
  }

  export const mediaDevices: {
    getUserMedia(constraints: any): Promise<MediaStream>;
  };
}