import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import './App.css'

interface Order {
  id: string
  items: { menuItemId: string; quantity: number }[]
  dietaryNotes?: string
  status: string
  createdAt: string
}

function App() {
  const [orders, setOrders] = useState<Order[]>([])
  const [socket, setSocket] = useState<any>(null)

  useEffect(() => {
    const socketConnection = io('http://localhost:4000')
    setSocket(socketConnection)

    // Listen for new paid orders
    socketConnection.on('order:paid', (order: Order) => {
      console.log('New paid order received:', order)
      setOrders(prev => [...prev, order])
      
      // Play audio notification
      playOrderNotification()
    })

    return () => {
      socketConnection.disconnect()
    }
  }, [])

  const playOrderNotification = () => {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  const completeOrder = (orderId: string) => {
    setOrders(prev => prev.filter(order => order.id !== orderId))
    console.log(`Order ${orderId} completed`)
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🍳 Kitchen Display System</h1>
        
        <div className="orders-grid">
          {orders.length === 0 ? (
            <div className="no-orders">
              <h2>No pending orders</h2>
              <p>Waiting for new orders...</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="order-ticket">
                <div className="order-header">
                  <h3>Order #{order.id.slice(-8)}</h3>
                  <span className="order-time">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="order-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <span className="quantity">{item.quantity}x</span>
                      <span className="item-name">{item.menuItemId}</span>
                    </div>
                  ))}
                </div>
                
                {order.dietaryNotes && (
                  <div className="dietary-notes">
                    <strong>Notes:</strong> {order.dietaryNotes}
                  </div>
                )}
                
                <button 
                  className="complete-button"
                  onClick={() => completeOrder(order.id)}
                >
                  Complete Order
                </button>
              </div>
            ))
          )}
        </div>
      </header>
    </div>
  )
}

export default App
