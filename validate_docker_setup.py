#!/usr/bin/env python3
"""
Docker deployment validation script for GreenMatrix
Validates that all required files and configurations are in place
"""

import os
import sys

def validate_file_exists(file_path, description):
    """Validate that a required file exists"""
    if os.path.exists(file_path):
        print(f"[OK] {description}: {file_path}")
        return True
    else:
        print(f"[ERROR] {description}: {file_path} - NOT FOUND")
        return False

def validate_docker_compose():
    """Validate docker-compose.yml structure"""
    compose_file = "docker-compose.yml"
    
    if not os.path.exists(compose_file):
        print(f"✗ Docker Compose file not found: {compose_file}")
        return False
        
    try:
        with open(compose_file, 'r') as f:
            compose_content = f.read()
        
        required_services = ['postgres', 'redis', 'backend', 'frontend', 'data-collector', 'db-setup']
        
        print(f"[OK] Docker Compose file loaded successfully")
        
        missing_services = []
        for service in required_services:
            if f"{service}:" not in compose_content:
                missing_services.append(service)
        
        if missing_services:
            print(f"[ERROR] Missing required services: {missing_services}")
            return False
        else:
            print(f"[OK] All required services present: {required_services}")
            
        return True
        
    except Exception as e:
        print(f"[ERROR] Error reading docker-compose.yml: {e}")
        return False

def validate_dockerfiles():
    """Validate that all required Dockerfiles exist"""
    files_valid = True
    
    dockerfiles = [
        ("backend/Dockerfile", "Backend Dockerfile"),
        ("vite-project/Dockerfile", "Frontend Dockerfile"), 
        ("Dockerfile.collector", "Data Collector Dockerfile")
    ]
    
    for dockerfile, description in dockerfiles:
        if not validate_file_exists(dockerfile, description):
            files_valid = False
            
    return files_valid

def validate_config_files():
    """Validate configuration files"""
    files_valid = True
    
    config_files = [
        ("backend/init.sql", "Database initialization script"),
        ("scripts/create-multiple-postgresql-databases.sh", "Database creation script"),
        ("vite-project/nginx.conf", "Nginx configuration"),
        ("backend/requirements.txt", "Python requirements"),
        (".env.example", "Environment template"),
        ("config.ini", "Application configuration"),
        ("backend/seed_cost_models.py", "Cost models seeding script")
    ]
    
    for config_file, description in config_files:
        if not validate_file_exists(config_file, description):
            files_valid = False
            
    return files_valid

def validate_application_structure():
    """Validate application directory structure"""
    required_dirs = [
        "backend",
        "backend/app", 
        "backend/app/models",
        "backend/controllers",
        "backend/views",
        "vite-project",
        "vite-project/src",
        "vite-project/src/components",
        "scripts"
    ]
    
    dirs_valid = True
    for directory in required_dirs:
        if os.path.isdir(directory):
            print(f"[OK] Directory exists: {directory}")
        else:
            print(f"[ERROR] Directory missing: {directory}")
            dirs_valid = False
            
    return dirs_valid

def main():
    """Main validation function"""
    print("=" * 60)
    print("GreenMatrix Docker Deployment Validation")
    print("=" * 60)
    
    print("\n1. Validating Docker Compose Configuration...")
    compose_valid = validate_docker_compose()
    
    print("\n2. Validating Dockerfiles...")
    dockerfiles_valid = validate_dockerfiles()
    
    print("\n3. Validating Configuration Files...")
    config_valid = validate_config_files()
    
    print("\n4. Validating Application Structure...")
    structure_valid = validate_application_structure()
    
    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)
    
    all_valid = all([compose_valid, dockerfiles_valid, config_valid, structure_valid])
    
    if all_valid:
        print("[OK] All validations passed!")
        print("\nYour GreenMatrix application is ready for Docker deployment.")
        print("\nNext steps:")
        print("1. Copy .env.example to .env and configure your settings")
        print("2. Run: docker-compose up -d")
        print("3. Access the application at http://localhost:3000")
        sys.exit(0)
    else:
        print("[ERROR] Some validations failed!")
        print("\nPlease fix the issues above before deploying.")
        sys.exit(1)

if __name__ == "__main__":
    main()