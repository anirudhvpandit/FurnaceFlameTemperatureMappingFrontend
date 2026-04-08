import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import StationSelect from './StationSelect.jsx'
import EventLog from './EventLog.jsx'
import LoginPage from './LoginPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage/>} />
        <Route path="/station-select" element={<StationSelect />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/event-log" element={<EventLog />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
