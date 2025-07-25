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
  const [paymentData, setPaymentData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  
  // Speech-to-text state
  const [transcription, setTranscription] = useState('')
  const [speechWebSocket, setSpeechWebSocket] = useState<WebSocket | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [transcriptionHistory, setTranscriptionHistory] = useState<string[]>([])
  const [showVoiceInterface, setShowVoiceInterface] = useState(false)

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

  // Speech-to-text functions
  const connectToSpeechService = () => {
    try {
      // Configure speech service endpoint
      const SPEECH_SERVICE_URL = import.meta.env.VITE_SPEECH_SERVICE_URL || 'ws://localhost:8000/ws/transcribe'
      console.log('🔍 Environment variable VITE_SPEECH_SERVICE_URL:', import.meta.env.VITE_SPEECH_SERVICE_URL)
      console.log('🎤 Final speech service URL:', SPEECH_SERVICE_URL)
      console.log('🌐 All VITE environment variables:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')))
      const ws = new WebSocket(SPEECH_SERVICE_URL)
      
      ws.onopen = () => {
        console.log('Connected to speech service')
        setSpeechWebSocket(ws)
      }
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'transcription') {
          const newText = data.text
          setTranscription(prev => prev + ' ' + newText)
          setTranscriptionHistory(prev => [...prev, newText])
          setIsTranscribing(false)
        } else if (data.type === 'processing') {
          setIsTranscribing(true)
        } else if (data.type === 'error') {
          console.error('Transcription error:', data.message)
          setIsTranscribing(false)
        }
      }
      
      ws.onclose = () => {
        console.log('Disconnected from speech service')
        setSpeechWebSocket(null)
      }
      
      ws.onerror = (error) => {
        console.error('Speech service error:', error)
        setSpeechWebSocket(null)
      }
      
    } catch (error) {
      console.error('Failed to connect to speech service:', error)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      const audioChunks: BlobPart[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        
        if (speechWebSocket && speechWebSocket.readyState === WebSocket.OPEN) {
          const arrayBuffer = await audioBlob.arrayBuffer()
          speechWebSocket.send(arrayBuffer)
        }
      }
      
      // Record in chunks for real-time transcription
      recorder.start(3000) // 3-second chunks
      setMediaRecorder(recorder)
      setIsRecording(true)
      
      // Stop recording after 30 seconds (safety)
      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecording()
        }
      }, 30000)
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Microphone access is required for voice ordering')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
    }
    setIsRecording(false)
    setMediaRecorder(null)
  }

  const clearTranscription = () => {
    setTranscription('')
    setTranscriptionHistory([])
  }

  const toggleVoiceInterface = () => {
    console.log('🎤 Voice interface button clicked!')
    setShowVoiceInterface(!showVoiceInterface)
    if (!showVoiceInterface && !speechWebSocket) {
      console.log('🔌 Starting connection to speech service...')
      connectToSpeechService()
    }
  }

  // Voice recording functions are defined above (speech-enabled versions)

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
      setPaymentData(paymentResponse.data)
      
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
                onClick={toggleVoiceInterface}
                className={`voice-toggle ${showVoiceInterface ? 'active' : ''}`}
              >
                {showVoiceInterface ? '🗣️ Hide Voice Interface' : '🎤 Voice Ordering'}
              </button>
              
              {showVoiceInterface && (
                <div className="voice-interface">
                  <div className="voice-status">
                    <span className={`connection-status ${speechWebSocket ? 'connected' : 'disconnected'}`}>
                      {speechWebSocket ? '🟢 Connected to Speech Service' : '🔴 Disconnected'}
                    </span>
                  </div>
                  
                  <div className="voice-controls">
                    <button 
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={!speechWebSocket}
                      className={`voice-record-button ${isRecording ? 'recording' : ''}`}
                    >
                      {isRecording ? '🎙️ Stop Recording' : '🎤 Start Recording'}
                    </button>
                    
                    {transcription && (
                      <button 
                        onClick={clearTranscription}
                        className="clear-button"
                      >
                        🗑️ Clear
                      </button>
                    )}
                  </div>
                  
                  <div className="transcription-display">
                    <h4>Live Transcription:</h4>
                    <div className="transcription-text">
                      {isTranscribing && <span className="processing">🔄 Processing audio...</span>}
                      {transcription ? (
                        <p>{transcription}</p>
                      ) : (
                        <p className="placeholder">Your speech will appear here...</p>
                      )}
                    </div>
                    
                    {transcriptionHistory.length > 0 && (
                      <div className="transcription-history">
                        <h5>Recent phrases:</h5>
                        <ul>
                          {transcriptionHistory.slice(-5).map((phrase, index) => (
                            <li key={index}>{phrase}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="voice-instructions">
                    <p>💡 <strong>Instructions:</strong></p>
                    <p>• Click "Start Recording" and speak your order</p>
                    <p>• Say items like "I want two burgers and a cola"</p>
                    <p>• The transcription will appear above in real-time</p>
                    <p>• Use the cart below to manually add items for testing</p>
                  </div>
                </div>
              )}
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
            
            {paymentData && (
              <div className="payment-section">
                <h3>💰 Pay with Solana</h3>
                <div className="payment-details">
                  <div className="price-breakdown">
                    <p><strong>USD Amount:</strong> ${paymentData.amount?.toFixed(2) || '0.00'}</p>
                    <p><strong>SOL Amount:</strong> {paymentData.solAmount?.toFixed(6) || '0'} SOL</p>
                    <p><strong>SOL Price:</strong> ${paymentData.solPrice?.toFixed(2) || '0'}</p>
                  </div>
                  
                  {paymentData.qrCode && (
                    <div className="qr-code-container">
                      <img src={paymentData.qrCode} alt="Payment QR Code" className="qr-code" />
                      <p>📱 Scan QR code to pay with Solana</p>
                    </div>
                  )}
                  
                  <div className="payment-link">
                    <p><strong>🔗 Payment Link:</strong></p>
                    <code className="payment-uri">{paymentData.uri}</code>
                  </div>
                  
                  <div className="merchant-info">
                    <p><strong>📍 Merchant Wallet:</strong> {paymentData.merchantWallet}</p>
                  </div>
                </div>
              </div>
            )}
            
            <button 
              onClick={() => {setOrder(null); setPaymentData(null); setCart([])}} 
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
