import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { ModelConfigProvider } from './contexts/ModelConfigContext'
import { WalkthroughProvider } from './contexts/WalkthroughContext'
import AIWorkloadOptimizer from './components/AIWorkloadOptimizer'
import AdminPage from './components/AdminPage'
import ProcessDetailsPage from './components/ProcessDetailsPage'
import './App.css'

function App() {
  return (
    <DarkModeProvider>
      <ModelConfigProvider>
        <WalkthroughProvider>
          <Router>
            <Routes>
              <Route path="/" element={<AdminPage />} />
              <Route path="/workload" element={<AIWorkloadOptimizer />} />
              <Route path="/processes" element={<ProcessDetailsPage />} />
            </Routes>
          </Router>
        </WalkthroughProvider>
      </ModelConfigProvider>
    </DarkModeProvider>
  )
}

export default App
