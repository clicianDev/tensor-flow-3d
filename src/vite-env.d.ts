/// <reference types="vite/client" />

declare module '@tensorflow-models/hand-pose-detection' {
  export interface Hand {
    keypoints: Keypoint[];
    handedness: 'Left' | 'Right';
    score?: number;
  }

  export interface Keypoint {
    x: number;
    y: number;
    z?: number;
    name?: string;
  }

  export enum SupportedModels {
    MediaPipeHands = 'MediaPipeHands',
  }

  export interface MediaPipeHandsMediaPipeModelConfig {
    runtime: 'mediapipe' | 'tfjs';
    solutionPath?: string;
    modelType?: 'lite' | 'full';
    maxHands?: number;
    detectorModelUrl?: string;
    landmarkModelUrl?: string;
  }

  export interface HandDetector {
    estimateHands(
      image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
      config?: { flipHorizontal?: boolean }
    ): Promise<Hand[]>;
    dispose(): void;
  }

  export function createDetector(
    model: SupportedModels,
    config: MediaPipeHandsMediaPipeModelConfig
  ): Promise<HandDetector>;
}
