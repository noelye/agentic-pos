import { useState } from 'react'
import axios from 'axios'
import './App.css'

interface Order {
  id: string
  items: { menuItemId: string; quantity: number }[]
  status: string
  createdAt: string
}

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [qrUri, setQrUri] = useState<string>('')

  const startRecording = () => {
    setIsRecording(true)
    // TODO: Implement voice recording
    console.log('Started recording...')
  }

  const stopRecording = async () => {
    setIsRecording(false)
    console.log('Stopped recording...')
    
    // Mock order creation
    const orderData = {
      items: [{ menuItemId: 'burger', quantity: 1 }],
      dietaryNotes: 'No onions',
      language: 'en'
    }
    
    try {
      const response = await axios.post('http://localhost:4000/orders', orderData)
      setOrder(response.data)
      
      // Generate Solana payment QR
      const paymentResponse = await axios.post('http://localhost:4001/create', {
        orderId: response.data.id,
        amount: 0.1
      })
      setQrUri(paymentResponse.data.uri)
    } catch (error) {
      console.error('Error creating order:', error)
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Agentic POS - Customer Interface</h1>
        
        <div className="recording-section">
          <button 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            className={`record-button ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? '🎙️ Recording...' : '🎤 Hold to Record Order'}
          </button>
        </div>

        {order && (
          <div className="order-section">
            <h2>Order Created!</h2>
            <p>Order ID: {order.id}</p>
            <p>Status: {order.status}</p>
            
            {qrUri && (
              <div className="payment-section">
                <h3>Pay with Solana</h3>
                <div className="qr-placeholder">
                  <p>QR Code: {qrUri}</p>
                  <p>📱 Scan to pay</p>
                </div>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  )
}

export default App
