import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

interface VideoMoodDetectionProps {
  onExpressionDetected: (expression: string, confidence: number, expressions?: Record<string, number>) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

interface Expression {
  [key: string]: number;
}

interface FaceExpressions {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

const VideoMoodDetection: React.FC<VideoMoodDetectionProps> = ({
  onExpressionDetected,
  isMinimized,
  onToggleMinimize
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [currentExpression, setCurrentExpression] = useState<string>('neutral');
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const detectionIntervalRef = useRef<number | null>(null);

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      const MODEL_URL = '/models';
      
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      
      setIsModelLoaded(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading face-api models:', err);
      setError(`Failed to load face detection models: ${err.message}`);
      setIsLoading(false);
    }
  }, []);

  // Start webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onplaying = () => {
            if (isModelLoaded) {
              setTimeout(() => {
                if (videoRef.current && videoRef.current.readyState >= 2) {
                  startDetection();
                }
              }, 500); // Small delay to ensure video is fully ready
            }
          };
        
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Failed to access webcam');
    }
  }, [isModelLoaded]);

  // Map face-api expressions to mood categories
  const mapExpressionToMood = (expressions: FaceExpressions): { mood: string; confidence: number } => {
    const expressionEntries = Object.entries(expressions);
    const [dominantExpression, maxConfidence] = expressionEntries.reduce(
      (max, [expr, conf]) => conf > max[1] ? [expr, conf] : max,
      ['neutral', 0]
    );

    // Map face-api expressions to our mood system
    const moodMapping: { [key: string]: string } = {
      'happy': 'happy',
      'sad': 'stressed',
      'angry': 'stressed',
      'fearful': 'stressed',
      'disgusted': 'stressed',
      'surprised': 'content',
      'neutral': 'neutral'
    };

    const mood = moodMapping[dominantExpression] || 'neutral';
    return { mood, confidence: maxConfidence };
  };

  // Detect expressions
  const detectExpressions = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) {
      return;
    }

    try {
      // Use optimized detector options for better performance
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({
          inputSize: 224, // Smaller input size for faster processing
          scoreThreshold: 0.5 // Higher threshold to reduce false positives
        }))
        .withFaceExpressions();
      
      if (detections.length > 0) {
        const expressions = detections[0].expressions;
        const { mood, confidence } = mapExpressionToMood(expressions);
        
        setCurrentExpression(mood);
        setConfidence(confidence);
        // Convert FaceExpressions to Record<string, number>
        const expressionsRecord: Record<string, number> = {
          neutral: expressions.neutral,
          happy: expressions.happy,
          sad: expressions.sad,
          angry: expressions.angry,
          fearful: expressions.fearful,
          disgusted: expressions.disgusted,
          surprised: expressions.surprised
        };
        onExpressionDetected(mood, confidence, expressionsRecord);

        // Clear canvas (no face detection box drawn)
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    } catch (err) {
      console.error('Error detecting expressions:', err);
    }
  }, [isModelLoaded, onExpressionDetected]);

  // Start detection loop with optimized performance
  const startDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    // Reduced to 3 FPS for better performance while maintaining accuracy
    detectionIntervalRef.current = setInterval(() => {
      detectExpressions();
    }, 333);
  }, [detectExpressions]);

  // Initialize everything
  useEffect(() => {
    loadModels();
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [loadModels]);

  useEffect(() => {
    if (isModelLoaded) {
      startWebcam();
    }
  }, [isModelLoaded, startWebcam]);

  useEffect(() => {
    if (isModelLoaded && videoRef.current?.readyState === 4) {
      startDetection();
    }
  }, [isModelLoaded, startDetection]);

  // Additional effect to handle video ready state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      if (isModelLoaded && video.readyState >= 3) {
        startDetection();
      }
    };

    const handleLoadedData = () => {
      if (isModelLoaded && video.readyState >= 2) {
        startDetection();
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [isModelLoaded, startDetection]);

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden transition-all duration-300 ${
      isMinimized ? 'w-48 h-36' : 'w-80 h-60'
    }`}>
      {/* Header with controls */}
      <div className="absolute top-2 left-2 right-2 z-10 flex justify-between items-center">
        <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          Video Mood: {currentExpression} ({Math.round(confidence * 100)}%)
        </div>
        <button
          onClick={onToggleMinimize}
          className="bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-70 transition-all"
        >
          {isMinimized ? '⬜' : '➖'}
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-white text-sm">Loading face detection...</div>
        </div>
      )}

      {/* Video and canvas */}
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />
        {/* Debug button */}
        <button
          onClick={() => {
            if (isModelLoaded && videoRef.current) {
              detectExpressions();
            }
          }}
          className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs"
        >
          Test Detection
        </button>
      </div>

      {/* Status indicator */}
      <div className="absolute bottom-2 left-2">
        <div className={`w-3 h-3 rounded-full ${
          isModelLoaded ? 'bg-green-500' : 'bg-red-500'
        }`} />
      </div>
    </div>
  );
};

export default VideoMoodDetection;