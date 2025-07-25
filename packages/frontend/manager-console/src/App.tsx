import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'
import './App.css'

interface Order {
  id: string
  items: { menuItemId: string; quantity: number }[]
  dietaryNotes?: string
  language: string
  status: 'pending' | 'paid' | 'completed'
  createdAt: string
}

function App() {
  const [orders, setOrders] = useState<Order[]>([])
  const [socket, setSocket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    pending: 0,
    paid: 0,
    completed: 0,
    total: 0
  })

  useEffect(() => {
    const socketConnection = io('http://localhost:4000')
    setSocket(socketConnection)

    // Load initial orders
    loadOrders()

    // Listen for live order updates
    socketConnection.on('order:created', (order: Order) => {
      console.log('New order created:', order)
      setOrders(prev => [order, ...prev])
      updateStats()
    })

    socketConnection.on('order:updated', (order: Order) => {
      console.log('Order updated:', order)
      setOrders(prev => prev.map(o => o.id === order.id ? order : o))
      updateStats()
    })

    return () => {
      socketConnection.disconnect()
    }
  }, [])

  const loadOrders = async () => {
    try {
      // Since we don't have a GET endpoint yet, we'll simulate it
      setLoading(false)
      updateStats()
    } catch (error) {
      console.error('Error loading orders:', error)
      setLoading(false)
    }
  }

  const updateStats = () => {
    const pending = orders.filter(o => o.status === 'pending').length
    const paid = orders.filter(o => o.status === 'paid').length
    const completed = orders.filter(o => o.status === 'completed').length
    
    setStats({
      pending,
      paid,
      completed,
      total: orders.length
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9800'
      case 'paid': return '#4caf50'
      case 'completed': return '#2196f3'
      default: return '#666'
    }
  }

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>📊 Manager Console</h1>
        
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Orders</h3>
            <div className="stat-number">{stats.total}</div>
          </div>
          <div className="stat-card pending">
            <h3>Pending</h3>
            <div className="stat-number">{stats.pending}</div>
          </div>
          <div className="stat-card paid">
            <h3>Paid</h3>
            <div className="stat-number">{stats.paid}</div>
          </div>
          <div className="stat-card completed">
            <h3>Completed</h3>
            <div className="stat-number">{stats.completed}</div>
          </div>
        </div>

        <div className="orders-section">
          <h2>Live Orders Feed</h2>
          
          {orders.length === 0 ? (
            <div className="no-orders">
              <p>No orders yet. Waiting for new orders...</p>
            </div>
          ) : (
            <div className="orders-table">
              <div className="table-header">
                <span>Order ID</span>
                <span>Items</span>
                <span>Status</span>
                <span>Language</span>
                <span>Created</span>
              </div>
              
              {orders.map(order => (
                <div key={order.id} className="table-row">
                  <span className="order-id">#{order.id.slice(-8)}</span>
                  <span className="order-items">
                    {order.items.map(item => `${item.quantity}x ${item.menuItemId}`).join(', ')}
                  </span>
                  <span 
                    className="order-status"
                    style={{ color: getStatusColor(order.status) }}
                  >
                    {order.status.toUpperCase()}
                  </span>
                  <span className="order-language">{order.language.toUpperCase()}</span>
                  <span className="order-time">
                    {new Date(order.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>
    </div>
  )
}

export default App
