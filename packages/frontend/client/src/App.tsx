import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

interface MenuItem {
  id: string
  name: string
  description: string
  priceUsd: number
  category: string
  dietaryTags?: string[]
  available: boolean
  preparationTime: number
  calories?: number
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
  specialInstructions?: string
}

interface Order {
  id: string
  items: { menuItemId: string; quantity: number; specialInstructions?: string }[]
  status: string
  totalAmount?: number
  createdAt: string
}

function App() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [qrUri, setQrUri] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')

  useEffect(() => {
    loadMenu()
  }, [])

  const loadMenu = async () => {
    try {
      // Load categories
      const categoriesResponse = await axios.get('http://localhost:4000/menu/categories')
      const categoryNames = categoriesResponse.data.map((cat: any) => cat.name)
      setCategories(['All', ...categoryNames])

      // Load menu items
      const itemsResponse = await axios.get('http://localhost:4000/menu/items?available=true')
      setMenuItems(itemsResponse.data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading menu:', error)
      setLoading(false)
    }
  }

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory)

  const addToCart = (menuItem: MenuItem) => {
    const existingItem = cart.find(item => item.menuItem.id === menuItem.id)
    if (existingItem) {
      setCart(cart.map(item => 
        item.menuItem.id === menuItem.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { menuItem, quantity: 1 }])
    }
  }

  const removeFromCart = (menuItemId: string) => {
    setCart(cart.filter(item => item.menuItem.id !== menuItemId))
  }

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId)
    } else {
      setCart(cart.map(item => 
        item.menuItem.id === menuItemId 
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.menuItem.priceUsd * item.quantity), 0)
  }

  const startRecording = () => {
    setIsRecording(true)
    console.log('🎤 Voice recording started...')
    // TODO: Implement actual voice recording
  }

  const stopRecording = async () => {
    setIsRecording(false)
    console.log('🎤 Voice recording stopped...')
    
    // Simulate voice order processing
    setTimeout(() => {
      const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)]
      if (randomItem) {
        addToCart(randomItem)
        alert(`Added "${randomItem.name}" to your order via voice!`)
      }
    }, 1000)
  }

  const placeOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to your cart first!')
      return
    }

    try {
      const orderData = {
        items: cart.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions
        })),
        customerName: customerName || 'Customer',
        orderType: 'dine-in',
        language: 'en',
        totalAmount: getCartTotal()
      }

      const response = await axios.post('http://localhost:4000/orders', orderData)
      setOrder(response.data)
      
      // Generate payment QR
      const paymentResponse = await axios.post('http://localhost:4001/create', {
        orderId: response.data.id,
        amount: getCartTotal()
      })
      setQrUri(paymentResponse.data.uri)
      
      // Clear cart
      setCart([])
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Failed to place order. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading menu... 🍔</div>
      </div>
    )
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🍔 Agentic POS - Order Here!</h1>
        
        {!order ? (
          <>
            {/* Customer Name Input */}
            <div className="customer-input">
              <input
                type="text"
                placeholder="Enter your name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="name-input"
              />
            </div>

            {/* Voice Ordering */}
            <div className="voice-section">
              <button 
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                className={`voice-button ${isRecording ? 'recording' : ''}`}
              >
                {isRecording ? '🎙️ Listening...' : '🎤 Voice Order (Hold to Speak)'}
              </button>
            </div>

            {/* Category Filter */}
            <div className="category-filter">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Menu Items */}
            <div className="menu-grid">
              {filteredItems.map(item => (
                <div key={item.id} className="menu-item">
                  <h3>{item.name}</h3>
                  <p className="description">{item.description}</p>
                  <div className="item-details">
                    <span className="price">${item.priceUsd.toFixed(2)}</span>
                    <span className="prep-time">⏱️ {item.preparationTime}m</span>
                    {item.calories && <span className="calories">🔥 {item.calories} cal</span>}
                  </div>
                  {item.dietaryTags && item.dietaryTags.length > 0 && (
                    <div className="dietary-tags">
                      {item.dietaryTags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  <button 
                    onClick={() => addToCart(item)}
                    className="add-btn"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>

            {/* Shopping Cart */}
            {cart.length > 0 && (
              <div className="cart">
                <h2>🛒 Your Order</h2>
                {cart.map(item => (
                  <div key={item.menuItem.id} className="cart-item">
                    <span className="item-name">{item.menuItem.name}</span>
                    <div className="quantity-controls">
                      <button onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}>+</button>
                    </div>
                    <span className="item-total">${(item.menuItem.priceUsd * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.menuItem.id)} className="remove-btn">❌</button>
                  </div>
                ))}
                <div className="cart-total">
                  <strong>Total: ${getCartTotal().toFixed(2)}</strong>
                </div>
                <button onClick={placeOrder} className="place-order-btn">
                  Place Order 🚀
                </button>
              </div>
            )}
          </>
        ) : (
          /* Order Confirmation */
          <div className="order-confirmation">
            <h2>✅ Order Placed Successfully!</h2>
            <p><strong>Order ID:</strong> {order.id}</p>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Total:</strong> ${getCartTotal().toFixed(2)}</p>
            
            {qrUri && (
              <div className="payment-section">
                <h3>💰 Pay with Solana</h3>
                <div className="qr-placeholder">
                  <p>🔗 Payment Link: {qrUri}</p>
                  <p>📱 Scan QR code to pay</p>
                </div>
              </div>
            )}
            
            <button 
              onClick={() => {setOrder(null); setQrUri(''); setCart([])}} 
              className="new-order-btn"
            >
              Start New Order
            </button>
          </div>
        )}
      </header>
    </div>
  )
}

export default App
