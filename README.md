# React + TypeScript + TensorFlow.js Hand Tracking with 3D Ring

This project demonstrates real-time hand tracking using TensorFlow.js and React, featuring a **3D virtual ring** that automatically attaches to your ring finger!

## Features

- 🤚 Real-time hand detection and tracking
- 💍 **3D virtual ring on ring finger** (keypoints 13-14)
- 🎨 Visual hand landmarks and connections
- 👈👉 Supports both left and right hands (up to 2 hands)
- 📊 FPS counter for performance monitoring
- 🎨 Color-coded hands (green for left, red for right)
- 🎮 Interactive 3D graphics with React Three Fiber
- 📱 Responsive design

## Technologies Used

- **React 19** - UI framework
- **TypeScript** - Type-safe development
- **TensorFlow.js** - Machine learning in the browser
- **MediaPipe Hands** - Hand pose detection model
- **React Three Fiber** - React renderer for Three.js
- **Three.js** - 3D graphics library
- **Vite** - Fast build tool and dev server

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A modern web browser with webcam access

## Installation

1. Clone the repository (if not already done)
2. Install dependencies:

\`\`\`bash
npm install
\`\`\`

## Running the Project

Start the development server:

\`\`\`bash
npm run dev
\`\`\`

The app will open at \`http://localhost:5173\` (or another available port).

**Important:** You'll need to grant camera permissions when prompted by your browser.

## Usage

1. Open the application in your browser
2. Allow camera access when prompted
3. Show your hands to the camera (make sure ring finger is visible)
4. Watch as the application detects and tracks your hand movements
5. **See the 3D ring appear on your ring finger!** 💍
6. The app displays:
   - Hand landmarks (keypoints) as colored dots
   - Connections between landmarks
   - **3D animated ring on ring finger**
   - Hand label (Left/Right)
   - Real-time FPS counter
   - Hands detected counter

### 3D Ring Feature

The virtual ring:
- ✨ Automatically attaches between keypoints 13-14 (ring finger)
- 💎 Features a gold band with a cyan gemstone
- 🔄 Subtle animation and glow effects
- 🎨 Different colors for left (gold) and right (orange) hands
- 📍 Gold circle indicators show ring position on canvas

**See [RING_FEATURE.md](./RING_FEATURE.md) for detailed customization options!**

## Build for Production

\`\`\`bash
npm run build
\`\`\`

The built files will be in the \`dist/\` directory.

## Project Structure

\`\`\`
src/
├── components/
│   ├── HandTracking.tsx    # Main hand tracking component with 3D integration
│   └── Ring3D.tsx          # 3D ring component
├── App.tsx                  # Main app component
├── App.css                  # App styles
├── main.tsx                 # App entry point
└── index.css                # Global styles
\`\`\`

## How It Works

1. **Model Loading**: The MediaPipe Hands model is loaded from a CDN
2. **Camera Setup**: Accesses the user's webcam using \`getUserMedia\` API
3. **Detection Loop**: Continuously detects hands in video frames
4. **Visualization**: Draws hand landmarks and connections on a canvas overlay
5. **Performance**: Uses \`requestAnimationFrame\` for smooth rendering

## Customization

You can customize the hand tracking behavior in \`src/components/HandTracking.tsx\`:

- \`maxHands\`: Change the maximum number of hands to detect (default: 2)
- \`modelType\`: Switch between 'lite', 'full' models for performance/accuracy trade-offs
- Colors: Modify the hand colors by changing the \`fillStyle\` and \`strokeStyle\` values
- Canvas size: Adjust the \`width\` and \`height\` props

## Troubleshooting

### Camera not working
- Ensure your browser has permission to access the camera
- Check if another application is using the camera
- Try a different browser (Chrome/Edge recommended)

### Model loading slowly
- The model is loaded from a CDN, so internet speed affects loading time
- Consider hosting the model files locally for production

### Low FPS
- Try using the 'lite' model instead of 'full'
- Close other browser tabs/applications
- Ensure good lighting for better detection

## License

MIT

## Acknowledgments

- TensorFlow.js team for the hand pose detection model
- MediaPipe for the Hands solution
- Vite and React teams for excellent developer experience
