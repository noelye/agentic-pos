import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { io } from 'socket.io-client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

// Connect to the server
const socket = io('http://localhost:4000')

// Make socket and axios available globally for the app
window.socket = socket
window.axios = axios

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
