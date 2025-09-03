/**
 * Camera Capture Service
 * Provides functionality to capture images from video streams
 */

export interface CaptureOptions {
  quality?: number; // 0.0 to 1.0, default 0.8
  format?: 'jpeg' | 'png'; // default 'jpeg'
  width?: number;
  height?: number;
}

export interface CaptureResult {
  success: boolean;
  imageData?: string; // Base64 encoded image data (without data:image prefix)
  error?: string;
  timestamp: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export class CameraCaptureService {
  private static instance: CameraCaptureService;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  private constructor() {
    // Create a hidden canvas for image capture
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.context = ctx;
  }

  public static getInstance(): CameraCaptureService {
    if (!CameraCaptureService.instance) {
      CameraCaptureService.instance = new CameraCaptureService();
    }
    return CameraCaptureService.instance;
  }

  /**
   * Capture image from a video element
   */
  public captureFromVideo(
    videoElement: HTMLVideoElement,
    options: CaptureOptions = {}
  ): CaptureResult {
    try {
      if (!videoElement || videoElement.readyState < 2) {
        return {
          success: false,
          error: 'Video element not ready or not provided',
          timestamp: new Date().toISOString()
        };
      }

      const {
        quality = 0.8,
        format = 'jpeg',
        width = videoElement.videoWidth || 640,
        height = videoElement.videoHeight || 480
      } = options;

      // Set canvas dimensions
      this.canvas.width = width;
      this.canvas.height = height;

      // Draw video frame to canvas
      this.context.drawImage(videoElement, 0, 0, width, height);

      // Convert to base64
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = this.canvas.toDataURL(mimeType, quality);
      
      // Extract base64 data (remove data:image/jpeg;base64, prefix)
      const base64Data = dataUrl.split(',')[1];

      console.log('📸 Image captured successfully:', {
        dimensions: { width, height },
        format,
        quality,
        dataSize: base64Data.length
      });

      return {
        success: true,
        imageData: base64Data,
        timestamp: new Date().toISOString(),
        dimensions: { width, height }
      };

    } catch (error) {
      console.error('❌ Camera capture error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown capture error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Capture image from media stream
   */
  public captureFromStream(
    stream: MediaStream,
    options: CaptureOptions = {}
  ): CaptureResult {
    try {
      // Create a temporary video element
      const tempVideo = document.createElement('video');
      tempVideo.srcObject = stream;
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      
      return new Promise<CaptureResult>((resolve) => {
        tempVideo.onloadedmetadata = () => {
          tempVideo.play().then(() => {
            // Wait a bit for the video to start
            setTimeout(() => {
              const result = this.captureFromVideo(tempVideo, options);
              tempVideo.remove();
              resolve(result);
            }, 100);
          }).catch((error) => {
            tempVideo.remove();
            resolve({
              success: false,
              error: `Failed to play video: ${error.message}`,
              timestamp: new Date().toISOString()
            });
          });
        };

        tempVideo.onerror = () => {
          tempVideo.remove();
          resolve({
            success: false,
            error: 'Failed to load video from stream',
            timestamp: new Date().toISOString()
          });
        };
      }) as any; // Type assertion to handle Promise return

    } catch (error) {
      console.error('❌ Stream capture error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown stream capture error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get current video frame as ImageData
   */
  public getImageData(
    videoElement: HTMLVideoElement,
    options: CaptureOptions = {}
  ): ImageData | null {
    try {
      if (!videoElement || videoElement.readyState < 2) {
        return null;
      }

      const {
        width = videoElement.videoWidth || 640,
        height = videoElement.videoHeight || 480
      } = options;

      this.canvas.width = width;
      this.canvas.height = height;
      this.context.drawImage(videoElement, 0, 0, width, height);
      
      return this.context.getImageData(0, 0, width, height);
    } catch (error) {
      console.error('❌ Failed to get image data:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Export singleton instance
export const cameraCapture = CameraCaptureService.getInstance();

// Helper function for easy access
export const captureImageFromVideo = (
  videoElement: HTMLVideoElement,
  options?: CaptureOptions
): CaptureResult => {
  return cameraCapture.captureFromVideo(videoElement, options);
};