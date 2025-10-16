/**
 * Kalman Filter for smoothing position tracking
 * Reduces jitter while maintaining responsiveness
 */
export class KalmanFilter {
  private x: number; // Current estimate
  private p: number; // Estimation error covariance
  private q: number; // Process noise covariance
  private r: number; // Measurement noise covariance
  
  constructor(processNoise = 0.01, measurementNoise = 0.1, initialValue = 0) {
    this.x = initialValue;
    this.p = 1;
    this.q = processNoise;
    this.r = measurementNoise;
  }
  
  /**
   * Update filter with new measurement
   * @param measurement - New measured value
   * @returns Filtered value
   */
  filter(measurement: number): number {
    // Prediction update
    this.p = this.p + this.q;
    
    // Measurement update
    const k = this.p / (this.p + this.r); // Kalman gain
    this.x = this.x + k * (measurement - this.x);
    this.p = (1 - k) * this.p;
    
    return this.x;
  }
  
  /**
   * Reset filter to new value
   */
  reset(value: number): void {
    this.x = value;
    this.p = 1;
  }
}

/**
 * Exponential Moving Average - Much faster response than Kalman
 * Lower alpha = smoother but more lag
 * Higher alpha = more responsive but more jitter
 */
export class ExponentialSmoothing {
  private value: number;
  public alpha: number; // Made public for adaptive smoothing
  
  constructor(alpha = 0.7, initialValue = 0) {
    this.alpha = alpha; // 0.7 = very responsive
    this.value = initialValue;
  }
  
  filter(measurement: number): number {
    this.value = this.alpha * measurement + (1 - this.alpha) * this.value;
    return this.value;
  }
  
  reset(value: number): void {
    this.value = value;
  }
}

/**
 * Direct Position Tracker with Instant Teleportation
 * - Normal movement: Direct tracking (no delay)
 * - Dramatic jump: Instant teleport to new position
 * - Still hand: Micro-smoothing for stability
 */
export class ExponentialSmoothing3D {
  // Previous values for velocity calculation
  private previousX: number = 0;
  private previousY: number = 0;
  private previousZ: number = 0;
  private velocityMagnitude: number = 0;
  private previousTimestamp: number = 0;
  private isFirstFrame: boolean = true;
  
  // Micro-smoothing for still hand (anti-jitter only)
  private microX: number = 0;
  private microY: number = 0;
  private microZ: number = 0;
  private microRotation: number = 0;
  
  // Teleportation thresholds
  private teleportThreshold: number = 150; // pixels - instant teleport if jump > this
  private lastTeleportTime: number = 0;
  
  constructor(_alpha = 0.7, _minAlpha = 0.5, _maxAlpha = 0.95) {
    // Constructor params kept for compatibility but not used
    // We use direct tracking now
  }
  
  /**
   * Direct filter with instant teleportation on dramatic jumps
   */
  filter(x: number, y: number, z: number, rotation: number): {
    x: number;
    y: number;
    z: number;
    rotation: number;
  } {
    const now = performance.now();
    
    // Initialize on first frame
    if (this.isFirstFrame) {
      this.microX = x;
      this.microY = y;
      this.microZ = z;
      this.microRotation = rotation;
      this.previousX = x;
      this.previousY = y;
      this.previousZ = z;
      this.isFirstFrame = false;
      this.previousTimestamp = now;
      
      return { x, y, z, rotation };
    }
    
    // Calculate position jump distance (not velocity, just distance)
    const dx = x - this.previousX;
    const dy = y - this.previousY;
    const dz = z - this.previousZ;
    const jumpDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Calculate velocity for movement detection
    if (this.previousTimestamp > 0) {
      const deltaTime = (now - this.previousTimestamp) / 1000;
      if (deltaTime > 0) {
        this.velocityMagnitude = jumpDistance / deltaTime;
      }
    }
    
    // TELEPORTATION: Instant snap on dramatic position jumps
    // This handles cases where hand tracking suddenly detects finger far away
    const shouldTeleport = jumpDistance > this.teleportThreshold;
    
    let finalX, finalY, finalZ, finalRotation;
    
    if (shouldTeleport) {
      // ⚡ INSTANT TELEPORT - No smoothing, no interpolation
      // Ring immediately snaps to new position
      finalX = x;
      finalY = y;
      finalZ = z;
      finalRotation = rotation;
      
      // Reset micro-smooth values to new position
      this.microX = x;
      this.microY = y;
      this.microZ = z;
      this.microRotation = rotation;
      
      this.lastTeleportTime = now;
      
    } else {
      // Normal tracking (no dramatic jump detected)
      const isMoving = this.velocityMagnitude > 15; // 15 px/s threshold
      
      if (isMoving) {
        // DIRECT TRACKING - NO SMOOTHING when moving
        finalX = x;
        finalY = y;
        finalZ = z;
        finalRotation = rotation;
        
        // Update micro values for next frame
        this.microX = x;
        this.microY = y;
        this.microZ = z;
        this.microRotation = rotation;
      } else {
        // Hand is still - apply TINY smoothing to remove micro-jitter only
        const microAlpha = 0.2; // Very light smoothing
        this.microX = microAlpha * x + (1 - microAlpha) * this.microX;
        this.microY = microAlpha * y + (1 - microAlpha) * this.microY;
        this.microZ = microAlpha * z + (1 - microAlpha) * this.microZ;
        this.microRotation = microAlpha * rotation + (1 - microAlpha) * this.microRotation;
        
        finalX = this.microX;
        finalY = this.microY;
        finalZ = this.microZ;
        finalRotation = this.microRotation;
      }
    }
    
    // Store for next frame
    this.previousX = x;
    this.previousY = y;
    this.previousZ = z;
    this.previousTimestamp = now;
    
    return {
      x: finalX,
      y: finalY,
      z: finalZ,
      rotation: finalRotation,
    };
  }
  
  reset(x: number, y: number, z: number, rotation: number): void {
    this.previousX = x;
    this.previousY = y;
    this.previousZ = z;
    this.microX = x;
    this.microY = y;
    this.microZ = z;
    this.microRotation = rotation;
    this.velocityMagnitude = 0;
    this.previousTimestamp = 0;
    this.isFirstFrame = true;
  }
  
  /**
   * Get current velocity magnitude (for debugging/tuning)
   */
  getVelocity(): number {
    return this.velocityMagnitude;
  }
  
  /**
   * Get current tracking mode (for debugging)
   * Returns 2.0 when teleporting, 1.0 when moving (direct), 0.2 when still (micro-smooth)
   */
  getCurrentAlpha(): number {
    const now = performance.now();
    const timeSinceTeleport = now - this.lastTeleportTime;
    
    // Show teleport mode for 100ms after teleportation
    if (timeSinceTeleport < 100) {
      return 2.0; // Teleport indicator
    }
    
    return this.velocityMagnitude > 15 ? 1.0 : 0.2;
  }
  
  /**
   * Check if last frame was a teleportation (for debugging)
   */
  wasTeleportation(): boolean {
    const now = performance.now();
    return (now - this.lastTeleportTime) < 100; // Within 100ms
  }
  
  /**
   * Set teleport threshold (for tuning)
   */
  setTeleportThreshold(threshold: number): void {
    this.teleportThreshold = threshold;
  }
}

/**
 * Kalman Filter for 3D positions with rotation
 */
export class KalmanFilter3D {
  private xFilter: KalmanFilter;
  private yFilter: KalmanFilter;
  private zFilter: KalmanFilter;
  private rotationFilter: KalmanFilter;
  
  constructor(processNoise = 0.005, measurementNoise = 0.05) {
    this.xFilter = new KalmanFilter(processNoise, measurementNoise);
    this.yFilter = new KalmanFilter(processNoise, measurementNoise);
    this.zFilter = new KalmanFilter(processNoise, measurementNoise);
    this.rotationFilter = new KalmanFilter(processNoise * 2, measurementNoise * 2);
  }
  
  /**
   * Filter 3D position with rotation
   */
  filter(x: number, y: number, z: number, rotation: number): {
    x: number;
    y: number;
    z: number;
    rotation: number;
  } {
    return {
      x: this.xFilter.filter(x),
      y: this.yFilter.filter(y),
      z: this.zFilter.filter(z),
      rotation: this.rotationFilter.filter(rotation),
    };
  }
  
  /**
   * Reset all filters
   */
  reset(x: number, y: number, z: number, rotation: number): void {
    this.xFilter.reset(x);
    this.yFilter.reset(y);
    this.zFilter.reset(z);
    this.rotationFilter.reset(rotation);
  }
}
