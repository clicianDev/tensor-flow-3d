import './App.css'
import HandTracking from './components/HandTracking'

function App() {
  return (
    <div className="App">
      <h1>React + TensorFlow.js Hand Tracking</h1>
      <HandTracking width={640} height={480} />
    </div>
  )
}

export default App
