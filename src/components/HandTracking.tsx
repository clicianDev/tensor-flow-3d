import { useEffect, useRef, useState } from 'react';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import RingScene3D from './RingScene3D';
import { ExponentialSmoothing3D } from '../utils/kalmanFilter';

interface HandTrackingProps {
  width?: number;
  height?: number;
}

interface RingPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;
  handedness: 'Left' | 'Right';
}

const HandTracking: React.FC<HandTrackingProps> = ({ 
  width = 640, 
  height = 480 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<handPoseDetection.HandDetector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [fps, setFps] = useState(0);
  const [handsDetected, setHandsDetected] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [ringPositions, setRingPositions] = useState<RingPosition[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  
  // Exponential smoothing filters for each hand (much faster response than Kalman)
  const smoothingFiltersRef = useRef<Map<string, ExponentialSmoothing3D>>(new Map());
  
  // Get or create smoothing filter for a hand
  const getSmoothingFilter = (handedness: string): ExponentialSmoothing3D => {
    if (!smoothingFiltersRef.current.has(handedness)) {
      // alpha=0.8 means 80% new value, 20% old value = very responsive
      smoothingFiltersRef.current.set(handedness, new ExponentialSmoothing3D(0.8));
    }
    return smoothingFiltersRef.current.get(handedness)!;
  };

  // Initialize hand detector
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingMessage('Initializing TensorFlow.js...');
        
        // Wait for TensorFlow.js to be ready
        await tf.ready();
        console.log('TensorFlow.js ready with backend:', tf.getBackend());
        setLoadingMessage('Loading hand detection model...');
        
        // Use TensorFlow.js runtime instead of MediaPipe for better compatibility
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig = {
          runtime: 'tfjs',
          modelType: 'full',
          maxHands: 2,
        };
        
        console.log('Loading hand detection model...');
        const handDetector = await handPoseDetection.createDetector(model, detectorConfig);
        console.log('Hand detector loaded successfully!');
        
        setDetector(handDetector);
        setLoadingMessage('Ready!');
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing detector:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to initialize hand detector: ${errorMessage}. Try refreshing the page.`);
        setIsLoading(false);
      }
    };

    initializeDetector();

    return () => {
      if (detector) {
        detector.dispose();
      }
    };
  }, []);

  // Setup webcam
  useEffect(() => {
    const setupCamera = async () => {
      if (!videoRef.current) return;

      try {
        console.log('Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: width,
            height: height,
            facingMode: 'user',
          },
          audio: false,
        });

        videoRef.current.srcObject = stream;
        console.log('Camera stream acquired');
        
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = async () => {
              console.log('Video metadata loaded');
              try {
                await videoRef.current!.play();
                console.log('Video playing, camera ready!');
                setCameraReady(true);
                resolve();
              } catch (playErr) {
                console.error('Error playing video:', playErr);
              }
            };
          }
        });
      } catch (err) {
        console.error('Error accessing webcam:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to access webcam: ${errorMsg}. Please grant camera permissions.`);
      }
    };

    setupCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [width, height]);

  // Calculate ring position between keypoints 13 and 14 (ring finger) with smoothing
  const calculateRingPositions = (hands: handPoseDetection.Hand[]): RingPosition[] => {
    return hands.map(hand => {
      // Keypoint 13: Ring finger MCP (base)
      // Keypoint 14: Ring finger PIP (first joint)
      const kp13 = hand.keypoints[13];
      const kp14 = hand.keypoints[14];
      
      // Position ring much closer to keypoint 14 (80% toward kp14, 20% from kp13)
      const ringX = kp13.x * 0.2 + kp14.x * 0.82;
      const ringY = kp13.y * 0.2 + kp14.y * 0.82;
      const ringZ = (kp13.z || 0) * 0.2 + (kp14.z || 0) * 0.82;
      
      // Calculate rotation based on finger angle
      const angle = Math.atan2(kp14.y - kp13.y, kp14.x - kp13.x);
      
      // Apply exponential smoothing - much faster response than Kalman filter
      const handedness = hand.handedness as 'Left' | 'Right';
      const filter = getSmoothingFilter(handedness);
      const smoothed = filter.filter(ringX, ringY, ringZ, angle);
      
      return {
        x: smoothed.x,
        y: smoothed.y,
        z: smoothed.z,
        rotation: smoothed.rotation,
        handedness: handedness
      };
    });
  };

  // Draw hand landmarks
  const drawHands = (hands: handPoseDetection.Hand[], ctx: CanvasRenderingContext2D) => {
    hands.forEach((hand) => {
      // Draw keypoints
      hand.keypoints.forEach((keypoint) => {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = hand.handedness === 'Left' ? '#00FF00' : '#FF0000';
        ctx.fill();
      });

      // Draw connections
      const fingers = [
        [0, 1, 2, 3, 4],     // Thumb
        [0, 5, 6, 7, 8],     // Index
        [0, 9, 10, 11, 12],  // Middle
        [0, 13, 14, 15, 16], // Ring
        [0, 17, 18, 19, 20], // Pinky
      ];

      ctx.strokeStyle = hand.handedness === 'Left' ? '#00FF00' : '#FF0000';
      ctx.lineWidth = 2;

      fingers.forEach((finger) => {
        for (let i = 0; i < finger.length - 1; i++) {
          const start = hand.keypoints[finger[i]];
          const end = hand.keypoints[finger[i + 1]];
          
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
      });

      // Draw hand label
      if (hand.keypoints[0]) {
        ctx.fillStyle = hand.handedness === 'Left' ? '#00FF00' : '#FF0000';
        ctx.font = '16px Arial';
        ctx.fillText(
          `${hand.handedness} Hand`,
          hand.keypoints[0].x,
          hand.keypoints[0].y - 10
        );
      }
    });
  };

  // Main detection loop
  useEffect(() => {
    const detectHands = async () => {
      if (
        !detector ||
        !videoRef.current ||
        !canvasRef.current ||
        videoRef.current.readyState !== 4
      ) {
        animationFrameRef.current = requestAnimationFrame(detectHands);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Calculate FPS
      const now = performance.now();
      const deltaTime = now - lastFrameTimeRef.current;
      if (deltaTime > 0) {
        setFps(Math.round(1000 / deltaTime));
      }
      lastFrameTimeRef.current = now;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video frame
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      try {
        // Detect hands
        const hands = await detector.estimateHands(video, {
          flipHorizontal: false,
        });

        // Update hands detected count
        setHandsDetected(hands.length);

        // Calculate and update ring positions
        if (hands.length > 0) {
          const positions = calculateRingPositions(hands);
          setRingPositions(positions);
          console.log(`Detected ${hands.length} hand(s)`);
          drawHands(hands, ctx);
          
          // Draw ring indicators on canvas
          positions.forEach((pos, idx) => {
            const hand = hands[idx];
            
            // Highlight keypoints 13 and 14
            const kp13 = hand.keypoints[13];
            const kp14 = hand.keypoints[14];
            
            // Draw keypoint 13 marker (base of ring finger)
            ctx.beginPath();
            ctx.arc(kp13.x, kp13.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
            ctx.fill();
            ctx.strokeStyle = '#FF00FF';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw keypoint 14 marker (first joint)
            ctx.beginPath();
            ctx.arc(kp14.x, kp14.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.fill();
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw connection line between 13 and 14
            ctx.beginPath();
            ctx.moveTo(kp13.x, kp13.y);
            ctx.lineTo(kp14.x, kp14.y);
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(pos.rotation);
            
            // Draw ring circle at calculated position
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, 2 * Math.PI);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Draw inner circle
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, 2 * Math.PI);
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw small gem indicator
            ctx.beginPath();
            ctx.arc(0, -15, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#4ECDC4';
            ctx.fill();
            ctx.strokeStyle = '#00CED1';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
          });
        } else {
          setRingPositions([]);
        }
      } catch (err) {
        console.error('Error detecting hands:', err);
      }

      animationFrameRef.current = requestAnimationFrame(detectHands);
    };

    if (detector && !isLoading) {
      detectHands();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [detector, isLoading]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '1rem' 
    }}>
      <h2>TensorFlow.js Hand Tracking</h2>
      
      {isLoading && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{loadingMessage}</p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>This may take a moment...</p>
          <div style={{ 
            marginTop: '1rem',
            width: '200px',
            height: '4px',
            backgroundColor: '#e0e0e0',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #646cff, #ff6b6b)',
              animation: 'slide 1.5s ease-in-out infinite'
            }} />
          </div>
        </div>
      )}
      
      {error && (
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#fee', 
          color: '#c00',
          borderRadius: '8px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>⚠️ Error</p>
          <p style={{ marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Reload Page
          </button>
        </div>
      )}
      
      <div style={{ position: 'relative', display: isLoading || error ? 'none' : 'block' }}>
        <video
          ref={videoRef}
          width={width}
          height={height}
          autoPlay
          playsInline
          muted
          style={{ 
            display: showDebug ? 'block' : 'none',
            border: '2px solid #ff0',
            borderRadius: '8px',
            maxWidth: '100%',
            height: 'auto',
            marginBottom: showDebug ? '1rem' : '0'
          }}
        />
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ 
            border: '2px solid #333',
            borderRadius: '8px',
            maxWidth: '100%',
            height: 'auto',
            backgroundColor: '#000',
            display: showDebug ? 'none' : 'block'
          }}
        />
        
        {/* 3D Ring Overlay */}
        {ringPositions.length > 0 && !showDebug && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}>
            <RingScene3D 
              ringPositions={ringPositions} 
              width={width} 
              height={height} 
            />
          </div>
        )}
        
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '14px',
        }}>
          <div>FPS: {fps}</div>
          <div>Hands: {handsDetected}</div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            {cameraReady ? '🟢 Camera Ready' : '🟡 Waiting...'}
          </div>
        </div>
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: '1px solid #666',
            borderRadius: '4px',
            padding: '5px 10px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {showDebug ? '📊 Show Tracking' : '🎥 Show Video'}
        </button>
      </div>
      
      <div style={{ 
        textAlign: 'center', 
        maxWidth: '600px',
        padding: '1rem' 
      }}>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          <strong>Instructions:</strong> Show your hands to the camera. 
          Left hand appears in <span style={{ color: '#00FF00' }}>green</span>, 
          right hand in <span style={{ color: '#FF0000' }}>red</span>.
        </p>
      </div>
    </div>
  );
};

export default HandTracking;
