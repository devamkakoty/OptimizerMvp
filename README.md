# GreenMatrix - AI Hardware Optimization Platform

GreenMatrix is a comprehensive platform for optimizing AI workload hardware configurations, providing intelligent recommendations for both pre-deployment and post-deployment scenarios.

## 🚀 Features

- **Pre-Deployment Optimization**: Get hardware recommendations before deploying AI models
- **Post-Deployment Optimization**: Optimize existing AI workloads running on bare metal or VMs
- **Real-time Monitoring**: Monitor system performance, costs, and resource utilization
- **AI Model Management**: Manage and simulate AI model performance across different hardware
- **Cost Analysis**: Track and optimize infrastructure costs with detailed analytics
- **Hardware Recommendations**: Smart recommendations based on workload requirements

## 🐳 Quick Start with Docker (Recommended)

### Prerequisites
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** (included with Docker Desktop)
- **Git** for cloning the repository
- **8GB+ RAM** recommended
- **10GB+ free disk space**

---

## 🪟 Windows Deployment (Automated Setup)

### 1. Install Prerequisites
1. Install [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows/)
   - Enable WSL2 backend during installation
   - Ensure Docker Desktop is running (check system tray icon)
2. Install [Git for Windows](https://git-scm.com/download/win)

### 2. Clone and Deploy
```cmd
# Open Command Prompt or PowerShell
git clone https://github.com/YOUR_USERNAME/GreenMatrix.git
cd GreenMatrix

# Run automated setup script (will handle everything)
setup-greenmatrix.bat
```

The script will:
- ✅ Check Docker is installed and running
- ✅ Create `.env` from `.env.example` with default settings
- ✅ Create necessary directories
- ✅ Start all Docker services (PostgreSQL, TimescaleDB, Redis, Backend, Frontend, Airflow)
- ✅ Initialize databases with optimized indexes
- ✅ Load sample data
- ✅ Display access URLs and credentials

**⏱️ Total Time:** ~5-10 minutes (includes Docker image downloads)

### 3. Access the Application
- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Airflow Monitoring**: http://localhost:8080 (airflow/airflow)
- **PostgreSQL**: localhost:5432
- **TimescaleDB**: localhost:5433

### Troubleshooting Windows Deployment
```cmd
# If services fail to start, check logs
docker-compose logs backend
docker-compose logs postgres
docker-compose logs timescaledb

# Restart all services
docker-compose restart

# Complete reset
docker-compose down
docker volume prune
setup-greenmatrix.bat
```

---

## 🐧 Linux Deployment (Automated Setup)

### 1. Install Prerequisites
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose git

# RHEL/CentOS/Fedora
sudo yum install -y docker docker-compose git

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone and Deploy
```bash
git clone https://github.com/YOUR_USERNAME/GreenMatrix.git
cd GreenMatrix

# Make setup script executable
chmod +x setup-greenmatrix.sh

# Run automated setup
./setup-greenmatrix.sh
```

The script will:
- ✅ Check prerequisites (Docker, Docker Compose)
- ✅ Create environment configuration
- ✅ Build and start all services
- ✅ Initialize databases with TimescaleDB hypertables and indexes
- ✅ Set up host metrics collection (systemd service)
- ✅ Configure VM monitoring agents
- ✅ Set up Airflow monitoring and alerting
- ✅ Perform health checks

**⏱️ Total Time:** ~5-10 minutes

### 3. Access the Application
Same URLs as Windows deployment above.

### Linux-Specific Features
```bash
# View host metrics collection logs
journalctl -u greenmatrix-host-metrics -f

# Check service status
systemctl status greenmatrix-host-metrics

# Deploy VM monitoring agents to other machines
sudo ./deploy-vm-agent.sh
```

---

## 🔧 Manual Docker Deployment (All Platforms)

If you prefer manual control or the automated scripts don't work:

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/GreenMatrix.git
cd GreenMatrix
```

### 2. Configure Environment
```bash
# Linux/Mac
cp .env.example .env

# Windows (Command Prompt)
copy .env.example .env

# Edit .env if needed (default values work for local deployment)
# Key settings:
#   POSTGRES_PASSWORD=password
#   TIMESCALEDB_PORT=5433
#   BACKEND_PORT=8000
#   FRONTEND_PORT=3000
```

### 3. Start Services
```bash
# Start all services
docker-compose up -d

# Wait for databases to initialize (1-2 minutes)
docker-compose logs -f postgres timescaledb

# Check all containers are running
docker-compose ps

# View logs of specific service
docker-compose logs -f backend
```

### 4. Initialize Sample Data (Optional)
```bash
# The system includes sample data, but you can refresh it:
docker-compose exec backend python scripts/populate_from_csv.py
```

### 5. Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (complete reset)
docker-compose down -v
```

## 🛠️ Manual Setup (Development)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Set up PostgreSQL database first, then:
python -c "from app.database import init_db; init_db()"

# Run backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
cd vite-project
npm install
npm run dev
```

### Database Setup
```bash
# Create PostgreSQL database
createdb greenmatrix

# Initialize database schema
psql -d greenmatrix -f backend/init.sql
psql -d greenmatrix -f backend/vm_metrics_init.sql

# Populate with sample data
psql -d greenmatrix -f docker-init-data/05-seed-cost-models.sql
psql -d greenmatrix -f docker-init-data/06-create-empty-tables.sql
```

## 📁 Project Structure

```
GreenMatrix/
├── backend/                    # Python FastAPI backend
│   ├── app/                   # Core application
│   ├── controllers/           # API logic
│   ├── models/               # Database models
│   ├── views/                # API routes
│   └── requirements.txt      # Python dependencies
├── vite-project/             # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── styles/          # CSS styles
│   │   ├── hooks/           # Custom hooks
│   │   └── config/          # Configuration
│   └── package.json         # Node dependencies
├── Pickel Models/           # Pre-trained ML models
├── sample_data/            # Sample CSV data files
├── docker-init-data/       # Database initialization
├── scripts/               # Setup and utility scripts
├── airflow/              # Airflow DAGs and config
└── docker-compose.yml    # Docker services configuration
```

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://greenmatrix_user:secure_password@postgres:5432/greenmatrix

# Security
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# API Settings
API_HOST=0.0.0.0
API_PORT=8000
```

#### Frontend (vite-project/.env)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_TITLE=GreenMatrix
```

## 🎯 Usage

### 1. Simulate AI Model Performance
- Go to **Simulate** tab
- Select your AI model and task type
- Enter parameters or let the system auto-fill
- Get performance predictions across different hardware

### 2. Get Hardware Recommendations
- Use **Optimize** tab for hardware recommendations
- **Pre-deployment**: Get recommendations before deployment
- **Post-deployment**: Optimize existing workloads

### 3. Monitor System Performance
- **Admin Dashboard**: Real-time metrics and analytics
- **Performance Tab**: Detailed system monitoring
- **Cost Management**: Track infrastructure costs

## 🧪 API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🎨 Customization

### UI Modifications
- Frontend components are in `vite-project/src/components/`
- Styles are in `vite-project/src/styles/`
- Main styling: `vite-project/src/styles/AdminDashboardNew.css`

### Adding New Models
- Add model data to CSV files in `sample_data/`
- Place model files in `Pickel Models/`
- Update database using the admin interface

### Backend Extensions
- Controllers are in `backend/controllers/`
- API routes are in `backend/views/`
- Database models are in `backend/app/models/`

## 🔧 Troubleshooting

### Docker Issues
```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend

# Restart services
docker-compose restart

# Rebuild containers
docker-compose down
docker-compose up --build -d
```

### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d

# Check database connection
docker-compose exec postgres psql -U greenmatrix_user -d greenmatrix
```

### Frontend Issues
```bash
# Clear and reinstall dependencies
cd vite-project
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Documentation**: Check the `/docs` folder for detailed documentation
- **API Help**: Use the interactive API docs at `/docs` endpoint

## 🙏 Acknowledgments

- Built with FastAPI, React, and PostgreSQL
- Machine Learning models for hardware optimization
- Docker for easy deployment