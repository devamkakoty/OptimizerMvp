#!/usr/bin/env python3
"""
Script to clear the model database before repopulating
"""

import sys
import os
import requests
import json

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def clear_database(api_url: str = "http://localhost:8000") -> bool:
    """Clear the model database using the API endpoint"""
    try:
        response = requests.post(
            f"{api_url}/api/model/clear-database",
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[SUCCESS] Database cleared successfully: {result.get('message', '')}")
            return True
        else:
            print(f"[ERROR] Failed to clear database: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"[ERROR] Error calling API: {e}")
        return False

def main():
    """Main function to clear the database"""
    print("Clearing model database...\n")
    
    success = clear_database()
    
    if success:
        print("\n[SUCCESS] Database cleared successfully!")
        print("[SUCCESS] Ready for repopulation")
    else:
        print("\n[ERROR] Database clearing failed!")
    
    return success

if __name__ == "__main__":
    main() 