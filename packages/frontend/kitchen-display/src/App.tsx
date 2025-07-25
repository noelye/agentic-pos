import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'
import './App.css'

interface MenuItem {
  id: string
  name: string
  description: string
  category: string
  preparationTime: number
  dietaryTags?: string[]
}

interface OrderItem {
  menuItemId: string
  quantity: number
  specialInstructions?: string
}

interface Order {
  id: string
  items: OrderItem[]
  dietaryNotes?: string
  status: string
  createdAt: string
  customerName?: string
  orderType?: string
  totalAmount?: number
  transactionSignature?: string
}

function App() {
  const [orders, setOrders] = useState<Order[]>([])
  const [socket, setSocket] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Load menu items
    loadMenuItems()
    
    // Update current time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

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
      clearInterval(timeInterval)
    }
  }, [])

  const loadMenuItems = async () => {
    try {
      const response = await axios.get('http://localhost:4000/menu/items')
      setMenuItems(response.data)
    } catch (error) {
      console.error('Error loading menu items:', error)
    }
  }

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

  const getMenuItem = (menuItemId: string): MenuItem | undefined => {
    return menuItems.find(item => item.id === menuItemId)
  }

  const getOrderAge = (createdAt: string): string => {
    const orderTime = new Date(createdAt)
    const now = currentTime
    const diffMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes === 1) return '1 min ago'
    if (diffMinutes < 60) return `${diffMinutes} mins ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    return `${diffHours}h ${diffMinutes % 60}m ago`
  }

  const getOrderPriority = (createdAt: string): 'normal' | 'urgent' | 'critical' => {
    const orderTime = new Date(createdAt)
    const diffMinutes = Math.floor((currentTime.getTime() - orderTime.getTime()) / (1000 * 60))
    
    if (diffMinutes > 20) return 'critical'
    if (diffMinutes > 10) return 'urgent'
    return 'normal'
  }

  const getTotalPrepTime = (items: OrderItem[]): number => {
    return Math.max(...items.map(item => {
      const menuItem = getMenuItem(item.menuItemId)
      return menuItem?.preparationTime || 5
    }))
  }

  const completeOrder = async (orderId: string) => {
    try {
      // Update order status to completed
      await axios.patch(`http://localhost:4000/orders/${orderId}`, {
        status: 'completed'
      })
      
      setOrders(prev => prev.filter(order => order.id !== orderId))
      console.log(`Order ${orderId} completed`)
    } catch (error) {
      console.error('Error completing order:', error)
    }
  }

  return (
    <div className="kitchen-app">
      <header className="kitchen-header">
        <div className="header-left">
          <h1>🍳 Kitchen Display</h1>
          <span className="current-time">{currentTime.toLocaleTimeString()}</span>
        </div>
        <div className="header-right">
          <div className="orders-count">
            <span className="count">{orders.length}</span>
            <span className="label">Active Orders</span>
          </div>
        </div>
      </header>
      
      <main className="kitchen-main">
        {orders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">🍽️</div>
            <h2>All caught up!</h2>
            <p>No pending orders. Ready for the next one.</p>
          </div>
        ) : (
          <div className="orders-grid">
            {orders.map(order => {
              const priority = getOrderPriority(order.createdAt)
              const totalPrepTime = getTotalPrepTime(order.items)
              
              return (
                <div key={order.id} className={`order-card priority-${priority}`}>
                  <div className="order-card-header">
                    <div className="order-info">
                      <h3 className="order-number">#{order.id.slice(-6).toUpperCase()}</h3>
                      <div className="order-meta">
                        <span className="customer-name">{order.customerName || 'Customer'}</span>
                        <span className="order-type">{order.orderType || 'dine-in'}</span>
                      </div>
                    </div>
                    <div className="timing-info">
                      <div className="order-age">{getOrderAge(order.createdAt)}</div>
                      <div className="prep-time">~{totalPrepTime} min</div>
                    </div>
                  </div>

                  <div className="order-items">
                    {order.items.map((item, index) => {
                      const menuItem = getMenuItem(item.menuItemId)
                      return (
                        <div key={index} className="order-item">
                          <div className="item-quantity">{item.quantity}</div>
                          <div className="item-details">
                            <div className="item-name">
                              {menuItem?.name || 'Unknown Item'}
                            </div>
                            {menuItem?.category && (
                              <div className="item-category">{menuItem.category}</div>
                            )}
                            {item.specialInstructions && (
                              <div className="special-instructions">
                                ⚠️ {item.specialInstructions}
                              </div>
                            )}
                            {menuItem?.dietaryTags && menuItem.dietaryTags.length > 0 && (
                              <div className="dietary-tags">
                                {menuItem.dietaryTags.map(tag => (
                                  <span key={tag} className="dietary-tag">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {order.dietaryNotes && (
                    <div className="order-notes">
                      <strong>🗒️ Special Notes:</strong> {order.dietaryNotes}
                    </div>
                  )}

                  <div className="order-actions">
                    <button 
                      className="complete-button"
                      onClick={() => completeOrder(order.id)}
                    >
                      ✅ Complete Order
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
