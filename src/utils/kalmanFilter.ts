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
  private alpha: number;
  
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
 * 3D Exponential Smoothing - Faster alternative to Kalman filter
 */
export class ExponentialSmoothing3D {
  private xFilter: ExponentialSmoothing;
  private yFilter: ExponentialSmoothing;
  private zFilter: ExponentialSmoothing;
  private rotationFilter: ExponentialSmoothing;
  
  constructor(alpha = 0.7) {
    this.xFilter = new ExponentialSmoothing(alpha);
    this.yFilter = new ExponentialSmoothing(alpha);
    this.zFilter = new ExponentialSmoothing(alpha);
    this.rotationFilter = new ExponentialSmoothing(alpha * 0.9); // Slightly slower for rotation
  }
  
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
  
  reset(x: number, y: number, z: number, rotation: number): void {
    this.xFilter.reset(x);
    this.yFilter.reset(y);
    this.zFilter.reset(z);
    this.rotationFilter.reset(rotation);
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
