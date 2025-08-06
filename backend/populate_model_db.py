import csv
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import ModelSessionLocal, init_db
from controllers.model_controller import ModelController
from controllers.hardware_info_controller import HardwareInfoController

def read_csv_data(csv_file_path: str) -> list:
    """Read CSV data and convert to list of dictionaries"""
    data = []
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                # Convert numeric values, handling empty strings
                if 'Total Parameters (Millions)' in row and row['Total Parameters (Millions)'].strip():
                    row['Total Parameters (Millions)'] = float(row['Total Parameters (Millions)'])
                elif 'Total Parameters (Millions)' in row:
                    row['Total Parameters (Millions)'] = None
                    
                if 'Model Size (MB)' in row and row['Model Size (MB)'].strip():
                    row['Model Size (MB)'] = float(row['Model Size (MB)'])
                elif 'Model Size (MB)' in row:
                    row['Model Size (MB)'] = None
                    
                if 'Number of hidden Layers' in row and row['Number of hidden Layers'].strip():
                    row['Number of hidden Layers'] = int(row['Number of hidden Layers'])
                elif 'Number of hidden Layers' in row:
                    row['Number of hidden Layers'] = None
                    
                if 'Embedding Vector Dimension (Hidden Size)' in row and row['Embedding Vector Dimension (Hidden Size)'].strip():
                    row['Embedding Vector Dimension (Hidden Size)'] = int(row['Embedding Vector Dimension (Hidden Size)'])
                elif 'Embedding Vector Dimension (Hidden Size)' in row:
                    row['Embedding Vector Dimension (Hidden Size)'] = None
                    
                if 'Vocabulary Size' in row and row['Vocabulary Size'].strip():
                    row['Vocabulary Size'] = int(row['Vocabulary Size'])
                elif 'Vocabulary Size' in row:
                    row['Vocabulary Size'] = None
                    
                if 'FFN (MLP) Dimension' in row and row['FFN (MLP) Dimension'].strip():
                    row['FFN (MLP) Dimension'] = int(row['FFN (MLP) Dimension'])
                elif 'FFN (MLP) Dimension' in row:
                    row['FFN (MLP) Dimension'] = None
                    
                if 'Number of Attention Layers' in row and row['Number of Attention Layers'].strip():
                    row['Number of Attention Layers'] = int(row['Number of Attention Layers'])
                elif 'Number of Attention Layers' in row:
                    row['Number of Attention Layers'] = None
                
                data.append(row)
        return data
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return []

def populate_database():
    """Populate the Model_Recommendation_DB database with CSV data"""
    try:
        # Initialize database
        init_db()
        print("Database initialized successfully")
        
        # Read model CSV data
        model_csv_file_path = "../sample_data/Model_Info.csv"
        model_csv_data = read_csv_data(model_csv_file_path)
        
        if not model_csv_data:
            print("No model data found in CSV file")
            return
        
        print(f"Found {len(model_csv_data)} models in CSV file")
        
        # Read hardware CSV data
        hardware_csv_file_path = "../sample_data/AvailableHW.csv"
        hardware_csv_data = read_csv_data(hardware_csv_file_path)
        
        if not hardware_csv_data:
            print("No hardware data found in CSV file")
            return
        
        print(f"Found {len(hardware_csv_data)} hardware configurations in CSV file")
        
        # Create database session
        db = ModelSessionLocal()
        model_controller = ModelController()
        hardware_controller = HardwareInfoController()
        
        try:
            # Populate model database
            print("Populating model database...")
            model_result = model_controller.populate_model_database(db, model_csv_data)
            
            if "error" in model_result:
                print(f"Error populating model database: {model_result['error']}")
            else:
                print(model_result["message"])
            
            # Populate hardware database
            print("Populating hardware database...")
            hardware_result = hardware_controller.populate_hardware_database(db, hardware_csv_data)
            
            if "error" in hardware_result:
                print(f"Error populating hardware database: {hardware_result['error']}")
            else:
                print(hardware_result["message"])
            
            print("Database population completed!")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    populate_database() 