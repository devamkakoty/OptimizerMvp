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
- Docker and Docker Compose installed
- Git installed
- 8GB+ RAM recommended
- 10GB+ free disk space

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/GreenMatrix.git
cd GreenMatrix
```

### 2. Environment Setup
```bash
# Copy environment template files
cp .env.example .env
cp vite-project/.env.example vite-project/.env

# Edit the .env files if needed (default values should work)
```

### 3. Deploy with Docker
```bash
# Build and start all services
docker-compose up -d

# Check if all containers are running
docker-compose ps
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 5. Initialize Sample Data (Optional)
```bash
# The system includes sample data, but you can refresh it:
docker-compose exec backend python scripts/populate_from_csv.py
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