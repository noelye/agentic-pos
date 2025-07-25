#!/usr/bin/env python3
"""
Flask-based HTTP server for the Agentic POS Strands Agent
Uses Flask to avoid HTTP protocol issues with http.server
"""
import json
import os
import base64
from datetime import datetime
import pymongo
from dotenv import load_dotenv
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/agentic-pos")

# API endpoints
PAYMENTS_URL = os.getenv("PAYMENTS_URL", "http://localhost:4001")
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:4000")

# Minimax API configuration
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY")
MINIMAX_API_URL = "https://api.minimax.io/v1/chat/completions"

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def analyze_menu_image(image_base64: str) -> dict:
    """
    Analyze menu image using Minimax API to extract menu items
    """
    if not MINIMAX_API_KEY:
        return {"error": "Minimax API key not configured"}
    
    try:
        # Prepare the prompt for menu analysis
        prompt = """
        Analyze this menu image and extract all menu items. For each item, provide:
        - name: The dish name
        - description: Brief description of the dish
        - priceUsd: Price in USD (extract number only)
        - category: Food category (Burgers, Sides, Beverages, Desserts, Salads, etc.)
        - dietaryTags: Array of dietary tags (vegetarian, vegan, gluten-free, etc.)
        - preparationTime: Estimated prep time in minutes
        - calories: Estimated calories (if visible)
        - ingredients: Array of main ingredients (if visible)
        
        Return the data as a JSON array of menu items. Only include items that are clearly visible and have prices.
        """
        
        # Prepare messages in the correct Minimax format
        messages = [
            {
                "role": "system",
                "content": "MM Intelligent Assistant is a large language model that is self-developed by MiniMax and does not call the interface of other products."
            },
            {
                "role": "user",
                "name": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        }
                    }
                ]
            }
        ]
        
        # Prepare headers and payload for Minimax API
        headers = {
            "Authorization": f"Bearer {MINIMAX_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "MiniMax-Text-01",
            "messages": messages,
            "max_tokens": 4096
        }
        
        # Call Minimax API
        response = requests.post(MINIMAX_API_URL, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # Try to extract JSON from the response
            try:
                # Find JSON array in the response
                start_idx = content.find('[')
                end_idx = content.rfind(']') + 1
                if start_idx != -1 and end_idx != 0:
                    json_str = content[start_idx:end_idx]
                    menu_items = json.loads(json_str)
                    return {"success": True, "menu_items": menu_items}
                else:
                    return {"error": "Could not extract menu items from response", "content": content}
            except json.JSONDecodeError as e:
                return {"error": f"Failed to parse JSON response: {str(e)}", "content": content}
        else:
            return {"error": f"Minimax API error: {response.status_code}", "response": response.text}
            
    except Exception as e:
        return {"error": f"Error processing image: {str(e)}"}

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "agentic-pos-strands-agent",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/tools', methods=['GET'])
def tools():
    """List available tools"""
    return jsonify({
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
    })

@app.route('/', methods=['GET'])
def info():
    """Service information"""
    return jsonify({
        "service": "Agentic POS Strands Agent",
        "version": "1.0.0",
        "description": "AI agent for restaurant POS operations with menu image analysis",
        "endpoints": {
            "GET /health": "Health check",
            "POST /process": "Process frontend requests",
            "POST /analyze-menu": "Analyze menu image",
            "GET /tools": "List available tools"
        }
    })

@app.route('/process', methods=['POST'])
def process():
    """Process frontend requests"""
    try:
        request_data = request.get_json()
        request_type = request_data.get("type")
        
        if request_type == "analyze_menu_image":
            image_base64 = request_data.get("data", {}).get("image")
            
            if not image_base64:
                return jsonify({"success": False, "error": "No image data provided"})
            
            # Remove data URL prefix if present
            if image_base64.startswith('data:image'):
                image_base64 = image_base64.split(',')[1]
            
            result = analyze_menu_image(image_base64)
            return jsonify({"success": True, "data": result})
            
        elif request_type == "update_menu":
            menu_items = request_data.get("data", {}).get("menu_items", [])
            
            try:
                # Update menu items in the database
                for item in menu_items:
                    # Add required fields if missing
                    if "available" not in item:
                        item["available"] = True
                    if "preparationTime" not in item:
                        item["preparationTime"] = 10
                    
                    # Create or update menu item
                    update_response = requests.post(f"{SERVER_URL}/menu/items", json=item)
                    
                    if update_response.status_code not in [200, 201]:
                        return jsonify({"success": False, "error": f"Failed to update menu item: {update_response.status_code}"})
                
                return jsonify({
                    "success": True,
                    "message": f"Successfully updated {len(menu_items)} menu items"
                })
                
            except requests.exceptions.RequestException as e:
                return jsonify({
                    "success": False,
                    "error": f"Service connection error: {str(e)}"
                })
                
        else:
            return jsonify({
                "success": False,
                "error": f"Unknown request type: {request_type}"
            })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        })

@app.route('/analyze-menu', methods=['POST'])
def analyze_menu():
    """Analyze menu image directly"""
    try:
        request_data = request.get_json()
        image_base64 = request_data.get("image")
        
        if not image_base64:
            return jsonify({"error": "No image data provided"})
        
        # Remove data URL prefix if present
        if image_base64.startswith('data:image'):
            image_base64 = image_base64.split(',')[1]
        
        result = analyze_menu_image(image_base64)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"})

if __name__ == "__main__":
    print("🚀 Agentic POS Strands Agent Server (Flask) running on port 4002")
    print("📡 Health check: http://localhost:4002/health")
    print("🎤 Process requests: http://localhost:4002/process")
    print("📷 Analyze menu: http://localhost:4002/analyze-menu")
    print("🔧 Available tools: http://localhost:4002/tools")
    print("📋 Service info: http://localhost:4002/")
    print("Press Ctrl+C to stop the server")
    
    app.run(host='0.0.0.0', port=4002, debug=False) 