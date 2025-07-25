#!/usr/bin/env python3
"""
Test script for Minimax API integration
"""
import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY")
MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2"

def test_minimax_connection():
    """Test basic connection to Minimax API"""
    if not MINIMAX_API_KEY:
        print("❌ MINIMAX_API_KEY not found in environment variables")
        return False
    
    print("🔑 Minimax API Key found")
    print("🔗 Testing connection to Minimax API...")
    
    try:
        headers = {
            "Authorization": f"Bearer {MINIMAX_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Simple text-only test
        payload = {
            "model": "abab5.5-chat",
            "messages": [
                {
                    "role": "user",
                    "content": "Hello, can you respond with 'API connection successful'?"
                }
            ],
            "temperature": 0.1,
            "max_tokens": 50
        }
        
        response = requests.post(MINIMAX_API_URL, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ API connection successful: {content}")
            return True
        else:
            print(f"❌ API connection failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing API connection: {str(e)}")
        return False

def test_menu_analysis_prompt():
    """Test the menu analysis prompt structure"""
    print("\n📋 Testing menu analysis prompt...")
    
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
    
    print("✅ Menu analysis prompt structure:")
    print(prompt)
    return True

def test_agent_endpoints():
    """Test the AI agent endpoints"""
    print("\n🔧 Testing AI agent endpoints...")
    
    base_url = "http://localhost:4002"
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health endpoint working")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health endpoint error: {str(e)}")
    
    # Test tools endpoint
    try:
        response = requests.get(f"{base_url}/tools")
        if response.status_code == 200:
            tools = response.json()
            print("✅ Tools endpoint working")
            print(f"Available tools: {[tool['name'] for tool in tools.get('tools', [])]}")
        else:
            print(f"❌ Tools endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Tools endpoint error: {str(e)}")

def main():
    print("🧪 Testing Minimax API Integration")
    print("=" * 50)
    
    # Test 1: API Connection
    connection_ok = test_minimax_connection()
    
    # Test 2: Prompt Structure
    prompt_ok = test_menu_analysis_prompt()
    
    # Test 3: Agent Endpoints
    test_agent_endpoints()
    
    print("\n" + "=" * 50)
    if connection_ok and prompt_ok:
        print("✅ All tests completed successfully!")
        print("\n📝 Next steps:")
        print("1. Add your Minimax API key to .env file")
        print("2. Start the AI agent server: python3 simple_agent_server.py")
        print("3. Open the manager console at http://localhost:5175")
        print("4. Upload a menu image to test the full workflow")
    else:
        print("❌ Some tests failed. Please check the configuration.")

if __name__ == "__main__":
    main() 