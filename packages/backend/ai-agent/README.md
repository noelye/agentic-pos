# 🍽️ Agentic POS Menu Manager

An AI-powered menu management system that uses **Minimax API** to automatically extract menu items from images and update your restaurant's menu database.

## ✨ Features

### 🖼️ **Menu Image Analysis**
- Upload menu images (JPEG, PNG, etc.)
- AI-powered extraction of menu items using [Minimax API](https://www.minimax.io/platform/document/ChatCompletion%20v2?key=66701d281d57f38758d581d0)
- Automatic detection of:
  - Dish names and descriptions
  - Prices in USD
  - Food categories
  - Dietary tags (vegetarian, vegan, gluten-free, etc.)
  - Preparation times
  - Calorie estimates
  - Ingredient lists

### 🗄️ **Database Integration**
- Direct integration with MongoDB
- Automatic menu item creation/updates
- Structured data storage with rich metadata
- Real-time menu synchronization

### 🎨 **Modern UI**
- Beautiful manager console interface
- Image preview functionality
- Real-time analysis results
- Responsive design for all devices

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Manager       │    │   AI Agent      │    │   MongoDB       │
│   Console       │───▶│   (Port 4002)   │───▶│   Database      │
│   (Port 5175)   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Minimax API   │
                       │   (Image AI)    │
                       └─────────────────┘
```

## 🚀 Quick Start

### 1. **Environment Setup**
Add your Minimax API key to `.env`:
```bash
MINIMAX_API_KEY=your_minimax_api_key_here
```

### 2. **Start Services**
```bash
# Start all services
npm run dev

# Or start individually:
npm run dev:server      # Main server (port 4000)
npm run dev:payments    # Payments service (port 4001)
npm run dev:ai-agent    # AI agent (port 4002)
npm run dev:client      # Customer app (port 5173)
npm run dev:kitchen     # Kitchen display (port 5174)
npm run dev:manager     # Manager console (port 5175)
```

### 3. **Test Integration**
```bash
cd packages/backend/ai-agent
python3 test_minimax.py
```

### 4. **Use the Manager Console**
1. Open http://localhost:5175
2. Upload a menu image
3. Click "Analyze Menu"
4. Review extracted items
5. Click "Update Menu" to save to database

## 🔧 API Endpoints

### AI Agent (Port 4002)

#### `GET /health`
Health check endpoint.
```json
{
  "status": "healthy",
  "service": "agentic-pos-strands-agent",
  "timestamp": "2025-07-25T15:44:48.123456"
}
```

#### `POST /process`
Process menu analysis requests.

**Analyze Menu Image:**
```json
{
  "type": "analyze_menu_image",
  "data": {
    "image": "base64_encoded_image_data"
  }
}
```

**Update Menu:**
```json
{
  "type": "update_menu",
  "data": {
    "menu_items": [
      {
        "name": "Classic Cheeseburger",
        "description": "Beef patty with cheddar cheese...",
        "priceUsd": 12.99,
        "category": "Burgers",
        "dietaryTags": [],
        "preparationTime": 8,
        "calories": 650,
        "ingredients": ["beef patty", "cheddar cheese", ...]
      }
    ]
  }
}
```

#### `GET /tools`
List available AI tools.
```json
{
  "tools": [
    {
      "name": "analyze_menu_image",
      "description": "Analyze menu image and extract menu items using AI",
      "parameters": {
        "image_base64": "Base64 encoded image data"
      }
    },
    {
      "name": "update_menu",
      "description": "Update menu items in database",
      "parameters": {
        "menu_items": "Array of menu items to add/update"
      }
    }
  ]
}
```

## 🖼️ Menu Image Analysis

### Supported Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- Other common image formats

### Analysis Capabilities
The AI can extract:
- **Dish Names**: "Classic Cheeseburger", "BBQ Bacon Burger"
- **Descriptions**: Detailed dish descriptions
- **Prices**: USD pricing with decimal precision
- **Categories**: Burgers, Sides, Beverages, Desserts, Salads
- **Dietary Tags**: vegetarian, vegan, gluten-free, dairy-free
- **Preparation Times**: Estimated cooking/prep times
- **Calories**: Nutritional estimates
- **Ingredients**: Main ingredient lists

### Example Analysis Output
```json
{
  "success": true,
  "menu_items": [
    {
      "name": "Classic Cheeseburger",
      "description": "Beef patty with cheddar cheese, lettuce, tomato, and our special sauce",
      "priceUsd": 12.99,
      "category": "Burgers",
      "dietaryTags": [],
      "preparationTime": 8,
      "calories": 650,
      "ingredients": ["beef patty", "cheddar cheese", "lettuce", "tomato", "special sauce", "brioche bun"]
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Required
MINIMAX_API_KEY=your_minimax_api_key_here

# Optional (defaults shown)
SERVER_URL=http://localhost:4000
PAYMENTS_URL=http://localhost:4001
MONGO_URI=mongodb://localhost:27017/agentic-pos
```

### Minimax API Setup
1. Sign up at [Minimax Platform](https://www.minimax.io/)
2. Get your API key from the dashboard
3. Add to `.env` file
4. Test connection with `python3 test_minimax.py`

## 🧪 Testing

### Test Minimax Integration
```bash
cd packages/backend/ai-agent
python3 test_minimax.py
```

### Test AI Agent Endpoints
```bash
# Health check
curl http://localhost:4002/health

# List tools
curl http://localhost:4002/tools

# Test menu analysis (with base64 image)
curl -X POST http://localhost:4002/process \
  -H "Content-Type: application/json" \
  -d '{
    "type": "analyze_menu_image",
    "data": {
      "image": "base64_encoded_image_data"
    }
  }'
```

## 🐛 Troubleshooting

### Common Issues

**1. Minimax API Key Not Found**
```
❌ MINIMAX_API_KEY not found in environment variables
```
**Solution**: Add your API key to `.env` file

**2. API Connection Failed**
```
❌ API connection failed: 401
```
**Solution**: Check your API key is correct and has proper permissions

**3. Image Analysis Fails**
```
❌ Could not extract menu items from response
```
**Solution**: 
- Ensure image is clear and readable
- Check image format is supported
- Verify image contains visible menu items with prices

**4. Database Update Fails**
```
❌ Failed to update menu item: 500
```
**Solution**: 
- Check MongoDB is running
- Verify server is running on port 4000
- Check network connectivity

### Debug Mode
Enable detailed logging by setting:
```bash
LOG_LEVEL=debug
```

## 📝 Development

### Adding New Analysis Features
1. Modify the prompt in `analyze_menu_image()` function
2. Update the response parsing logic
3. Test with various menu images
4. Update the frontend to display new fields

### Customizing the AI Model
The system uses Minimax's `abab5.5-chat` model. To change:
1. Update `model` parameter in the API call
2. Adjust `temperature` and `max_tokens` as needed
3. Test with your specific use case

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Agentic POS system. See main project license for details.

---

**🎯 Ready to revolutionize your menu management? Upload an image and let AI do the work!** 