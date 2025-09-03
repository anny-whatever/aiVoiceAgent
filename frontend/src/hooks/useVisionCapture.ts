/**
 * Vision Capture Hook
 * Integrates speech keyword detection with camera capture functionality
 */

import { useRef, useCallback, useEffect } from 'react';
import { createVisionKeywordDetector, KeywordMatch } from '../services/speechKeywordDetection';
import { VideoMoodDetectionRef } from '../components/VideoMoodDetection';
import { CaptureOptions, CaptureResult } from '../services/cameraCapture';
import { ApiService } from '../services/api';
import { ApiResponse } from '../types';

interface VisionCaptureOptions {
  enabled?: boolean;
  captureOptions?: CaptureOptions;
  onCaptureStart?: () => void;
  onCaptureComplete?: (result: CaptureResult) => void;
  onAnalysisComplete?: (analysis: string) => void;
  onError?: (error: string) => void;
}

interface VisionCaptureHook {
  isEnabled: boolean;
  isListening: boolean;
  lastCapture: CaptureResult | null;
  lastAnalysis: string | null;
  startListening: () => void;
  stopListening: () => void;
  manualCapture: (context?: string) => Promise<void>;
  setVideoRef: (ref: React.RefObject<VideoMoodDetectionRef>) => void;
}

export const useVisionCapture = (options: VisionCaptureOptions = {}): VisionCaptureHook => {
  const {
    enabled = true,
    captureOptions = {},
    onCaptureStart,
    onCaptureComplete,
    onAnalysisComplete,
    onError
  } = options;

  const videoRefRef = useRef<React.RefObject<VideoMoodDetectionRef> | null>(null);
  const isListeningRef = useRef(false);
  const lastCaptureRef = useRef<CaptureResult | null>(null);
  const lastAnalysisRef = useRef<string | null>(null);
  const keywordDetectorRef = useRef<any>(null);

  // Handle keyword detection and trigger capture
  const handleKeywordDetected = useCallback(async (match: KeywordMatch) => {
    const { keyword, context } = match;
    console.log('🎯 Vision keyword detected:', { keyword, context });
    
    if (!videoRefRef.current?.current) {
      console.warn('⚠️ Video ref not available for capture');
      onError?.('Camera not available');
      return;
    }

    const videoMoodDetection = videoRefRef.current.current;
    
    if (!videoMoodDetection.isReady()) {
      console.warn('⚠️ Video not ready for capture');
      onError?.('Camera not ready');
      return;
    }

    try {
      onCaptureStart?.();
      
      // Capture image from video stream
      const captureResult = videoMoodDetection.captureImage(captureOptions);
      lastCaptureRef.current = captureResult;
      onCaptureComplete?.(captureResult);

      if (!captureResult.success || !captureResult.imageData) {
        throw new Error(captureResult.error || 'Failed to capture image');
      }

      console.log('📸 Image captured successfully, analyzing...');
      
      // Analyze the captured image
      const analysisResult: ApiResponse = await ApiService.analyzeImage({
        imageData: captureResult.imageData,
        context: context || `User said: "${keyword}" - please describe what you see in the image`
      });

      if (analysisResult.content) {
        lastAnalysisRef.current = analysisResult.content;
        onAnalysisComplete?.(analysisResult.content);
        console.log('🔍 Vision analysis complete:', analysisResult.content);
      } else {
        throw new Error('Failed to analyze image - no content returned');
      }

    } catch (error) {
      console.error('❌ Vision capture error:', error);
      onError?.(error instanceof Error ? error.message : 'Vision capture failed');
    }
  }, [captureOptions, onCaptureStart, onCaptureComplete, onAnalysisComplete, onError]);

  // Manual capture function
  const manualCapture = useCallback(async (context?: string) => {
    const mockMatch: KeywordMatch = {
      keyword: 'manual_capture',
      context: context || 'Manual image capture requested',
      confidence: 1.0,
      timestamp: Date.now()
    };
    await handleKeywordDetected(mockMatch);
  }, [handleKeywordDetected]);

  // Start listening for keywords
  const startListening = useCallback(() => {
    if (!enabled || isListeningRef.current) {
      return;
    }

    console.log('👂 Starting vision keyword detection...');
    keywordDetectorRef.current = createVisionKeywordDetector(handleKeywordDetected);
    isListeningRef.current = true;
  }, [enabled, handleKeywordDetected]);

  // Stop listening for keywords
  const stopListening = useCallback(() => {
    if (!isListeningRef.current) {
      return;
    }

    console.log('🔇 Stopping vision keyword detection...');
    keywordDetectorRef.current = null;
    isListeningRef.current = false;
  }, []);

  // Set video ref for capture
  const setVideoRef = useCallback((ref: React.RefObject<VideoMoodDetectionRef>) => {
    videoRefRef.current = ref;
    console.log('📹 Video ref set for vision capture');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isEnabled: enabled,
    isListening: isListeningRef.current,
    lastCapture: lastCaptureRef.current,
    lastAnalysis: lastAnalysisRef.current,
    startListening,
    stopListening,
    manualCapture,
    setVideoRef
  };
};

export default useVisionCapture;