import React, { useState, useRef } from 'react'
import axios from 'axios'
import './App.css'

interface MenuItem {
  id?: string
  name: string
  description: string
  priceUsd: number
  category: string
  dietaryTags?: string[]
  available: boolean
  preparationTime: number
  calories?: number
  ingredients?: string[]
}

interface AnalysisResult {
  success: boolean
  menu_items?: MenuItem[]
  error?: string
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      
      // Clear previous results
      setAnalysisResult(null)
      setMessage('')
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  const analyzeMenuImage = async () => {
    if (!selectedFile) {
      setMessage('Please select an image first')
      return
    }

    setIsAnalyzing(true)
    setMessage('Analyzing menu image...')

    try {
      const base64 = await convertFileToBase64(selectedFile)
      
      const response = await axios.post('http://localhost:4002/process', {
        type: 'analyze_menu_image',
        data: {
          image: base64
        }
      })

      if (response.data.success) {
        const result = response.data.data
        setAnalysisResult(result)
        setMessage(`Analysis complete! Found ${result.menu_items?.length || 0} menu items.`)
      } else {
        setMessage(`Analysis failed: ${response.data.error}`)
      }
    } catch (error) {
      console.error('Error analyzing image:', error)
      setMessage('Error analyzing image. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const updateMenu = async () => {
    if (!analysisResult?.menu_items) {
      setMessage('No menu items to update')
      return
    }

    setIsUpdating(true)
    setMessage('Updating menu...')

    try {
      const response = await axios.post('http://localhost:4002/process', {
        type: 'update_menu',
        data: {
          menu_items: analysisResult.menu_items
        }
      })

      if (response.data.success) {
        setMessage(`Successfully updated ${analysisResult.menu_items.length} menu items!`)
        setAnalysisResult(null)
        setSelectedFile(null)
        setPreviewUrl(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setMessage(`Update failed: ${response.data.error}`)
      }
    } catch (error) {
      console.error('Error updating menu:', error)
      setMessage('Error updating menu. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const clearAll = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setAnalysisResult(null)
    setMessage('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🍽️ Menu Manager Console</h1>
        <p>Upload a menu image to automatically extract and update menu items</p>

        {/* File Upload Section */}
        <div className="upload-section">
          <h2>📷 Upload Menu Image</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="file-input"
          />
          
          {previewUrl && (
            <div className="preview-section">
              <h3>Image Preview:</h3>
              <img src={previewUrl} alt="Menu preview" className="preview-image" />
            </div>
          )}

          <div className="button-group">
            <button 
              onClick={analyzeMenuImage}
              disabled={!selectedFile || isAnalyzing}
              className="analyze-btn"
            >
              {isAnalyzing ? '🔍 Analyzing...' : '🔍 Analyze Menu'}
            </button>
            
            <button onClick={clearAll} className="clear-btn">
              🗑️ Clear All
            </button>
          </div>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="results-section">
            <h2>📋 Analysis Results</h2>
            
            {analysisResult.success && analysisResult.menu_items ? (
              <div>
                <p className="success-message">
                  ✅ Found {analysisResult.menu_items.length} menu items
                </p>
                
                <div className="menu-items-list">
                  {analysisResult.menu_items.map((item, index) => (
                    <div key={index} className="menu-item-card">
                      <h3>{item.name}</h3>
                      <p className="description">{item.description}</p>
                      <div className="item-details">
                        <span className="price">${item.priceUsd}</span>
                        <span className="category">{item.category}</span>
                        <span className="prep-time">⏱️ {item.preparationTime}m</span>
                      </div>
                      {item.dietaryTags && item.dietaryTags.length > 0 && (
                        <div className="dietary-tags">
                          {item.dietaryTags.map(tag => (
                            <span key={tag} className="tag">{tag}</span>
                          ))}
                        </div>
                      )}
                      {item.calories && (
                        <span className="calories">🔥 {item.calories} cal</span>
                      )}
                    </div>
                  ))}
                </div>

                <button 
                  onClick={updateMenu}
                  disabled={isUpdating}
                  className="update-btn"
                >
                  {isUpdating ? '🔄 Updating...' : '💾 Update Menu'}
                </button>
              </div>
            ) : (
              <div className="error-message">
                ❌ {analysisResult.error}
              </div>
            )}
          </div>
        )}

        {/* Status Message */}
        {message && (
          <div className={`message ${message.includes('Error') || message.includes('failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </header>
    </div>
  )
}

export default App
