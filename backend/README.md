# LMS Automation Backend

Automated content management system for Learning Management Systems using browser automation and job queuing.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed on Windows
- Google OAuth credentials
- LMS platform credentials

### Deploy in 3 Steps

1. **Start Docker Desktop** (ensure it's running)

2. **Deploy Application**
   ```bash
   # Double-click this file
   start.bat
   ```

3. **Setup OAuth**
   - Visit: http://localhost:8000/test
   - Login with Google
   - Grant permissions

**Done!** Application is running at http://localhost:8000

## 📖 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Step-by-step guide for beginners
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment documentation
- **[CHECKLIST.txt](CHECKLIST.txt)** - Pre-flight and troubleshooting checklist

## 🎯 What It Does

Automates two main workflows:

**Assignments:**
1. **Assessment Cloning** - Clone and rename assessment templates
2. **Assignment Creation** - Create assignments in LMS

**Lectures:**
3. **Lecture Creation** - Create lecture entries with materials
4. **Notes Updates** - Update notes on existing lectures (uses `lecture_id` + `notes` columns from lecture sheet)

## 🏗️ Architecture

- **API Server** (Express.js) - REST API endpoints
- **Redis** - Queue backend and cache
- **Worker Services** (4x) - Background job processors
- **Playwright** - Browser automation
- **Google Sheets** - Data source via OAuth

## 🛠️ Management Commands

```bash
start.bat      # Start all services
stop.bat       # Stop all services
logs.bat       # View real-time logs
status.bat     # Check service status
restart.bat    # Restart services
```

## 📡 API Endpoints

### Data Loading
- `POST /api/add-data?type=assignments` - Load assignments from Google Sheets
- `POST /api/add-data?type=lectures` - Load lectures from Google Sheets

### Automation
- `POST /api/clone-assessment-template` - Start assessment cloning
- `POST /api/create-assignments` - Start assignment creation
- `POST /api/create-lectures` - Start lecture creation
- `POST /api/start-update-notes` - Start notes updates

### Status
- `GET /api/get-automation-status?type=assignments` - Get assignment status
- `GET /api/get-automation-status?type=lectures` - Get lecture status

### Configuration
- `POST /config/save` - Save credentials
- `GET /config/read` - Read credentials
- `POST /config/reset` - Reset credentials

## 🔧 Technology Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js 5.1.0
- **Queue**: BullMQ 5.63.0
- **Cache**: Redis 7 (via ioredis 5.8.2)
- **Automation**: Playwright 1.56.1
- **Auth**: Google OAuth 2.0
- **Data**: Google Sheets API
- **Container**: Docker & Docker Compose

## 📦 Services Running

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| API | lms_api | 8000 | REST API |
| Redis | lms_redis | 6379 | Queue/Cache |
| Clone Worker | lms_clone_worker | - | Assessment cloning |
| Assignment Worker | lms_assignment_worker | - | Assignment creation |
| Lecture Worker | lms_lecture_worker | - | Lecture creation |
| Notes Worker | lms_notes_worker | - | Notes updates |

## 💻 Usage Example

### PowerShell
```powershell
# Load assignments from Google Sheets
Invoke-WebRequest -Method POST "http://localhost:8000/api/add-data?type=assignments"

# Clone assessments
Invoke-WebRequest -Method POST "http://localhost:8000/api/clone-assessment-template"

# Create assignments
Invoke-WebRequest -Method POST "http://localhost:8000/api/create-assignments"

# Check status
Invoke-WebRequest "http://localhost:8000/api/get-automation-status?type=assignments"
```

### cURL
```bash
# Load data
curl -X POST "http://localhost:8000/api/add-data?type=assignments"

# Clone assessments
curl -X POST "http://localhost:8000/api/clone-assessment-template"

# Check status
curl "http://localhost:8000/api/get-automation-status?type=assignments"
```

## 🔍 Monitoring

### View Logs
```bash
# All services
logs.bat

# Specific service
docker-compose logs -f api
docker-compose logs -f clone_worker
```

### Check Status
```bash
# Quick status
status.bat

# Detailed status
docker-compose ps
docker stats
```

## 🐛 Troubleshooting

### Services won't start
```bash
stop.bat
docker-compose down
docker-compose build
start.bat
```

### OAuth issues
- Visit http://localhost:8000/test to re-authenticate
- Check `.env` has correct Google credentials

### Workers not processing
```bash
# Check Redis
docker-compose exec redis redis-cli ping

# Restart workers
restart.bat
```

### Browser automation fails
- Increase Docker Desktop memory to 6-8GB
- Settings > Resources > Memory

## 🔒 Security

**Never commit these files:**
- `.env` - Environment variables
- `config.json` - LMS credentials
- `tokens.json` - OAuth tokens

Already configured in [.gitignore](.gitignore)

## 📁 Project Structure

```
lms_automations_backend/
├── configs/                    # Configuration modules
│   ├── googleSheetClient.js   # Google OAuth client
│   └── redis_bullmq.config.js # Redis & BullMQ setup
├── routes/                     # API routes
│   ├── automation.routes.js   # Automation endpoints
│   └── config.routes.js        # Config management
├── utils/                      # Utility functions
│   ├── queues/                 # Worker queue handlers
│   ├── createAssignment.js     # Assignment logic
│   ├── createLecture.js        # Lecture logic
│   └── cloneAndEditAssessment.js
├── .env                        # Environment variables
├── config.json                 # LMS credentials
├── tokens.json                 # OAuth tokens (auto-generated)
├── server.js                   # Main Express server
├── package.json                # Dependencies
├── Dockerfile                  # Docker image config
├── docker-compose.yml          # Multi-container setup
├── start.bat                   # Start script
├── stop.bat                    # Stop script
├── logs.bat                    # Logs viewer
├── status.bat                  # Status checker
├── restart.bat                 # Restart script
├── README.md                   # This file
├── QUICK_START.md              # Beginner guide
├── DEPLOYMENT.md               # Full deployment docs
└── CHECKLIST.txt               # Pre-flight checklist
```

## 🎓 Workflow Example

### Assignment Automation

1. **Load data from Google Sheets**
   ```bash
   POST /api/add-data?type=assignments
   ```

2. **Clone assessments** (watch browser automation)
   ```bash
   POST /api/clone-assessment-template
   ```

3. **Create assignments** (after cloning completes)
   ```bash
   POST /api/create-assignments
   ```

4. **Verify status**
   ```bash
   GET /api/get-automation-status?type=assignments
   ```

### Lecture Automation

1. **Load data from Google Sheets**
   ```bash
   POST /api/add-data?type=lectures
   ```

2. **Create lectures**
   ```bash
   POST /api/create-lectures
   ```

3. **Update notes on existing lectures** *(fill `lecture_id` + `notes` in lecture sheet first)*
   ```bash
   POST /api/start-update-notes
   ```

4. **Verify status**
   ```bash
   GET /api/get-automation-status?type=lectures
   ```

## ⚙️ System Requirements

### Minimum
- Windows 10/11
- Docker Desktop
- 4GB RAM
- 10GB disk space

### Recommended
- Windows 11
- Docker Desktop with WSL2
- 8GB+ RAM
- 20GB+ disk space (SSD)
- 4+ CPU cores

## 🔄 Updating

After pulling new code:

```bash
stop.bat
docker-compose build
start.bat
```

## 💰 Cost

**100% FREE** - Runs entirely on your local machine with no cloud costs.

## 🌟 Features

- ✅ Automated browser interactions
- ✅ Job queue with retry logic
- ✅ Real-time status tracking
- ✅ Google Sheets integration
- ✅ Multi-worker architecture
- ✅ Health checks & monitoring
- ✅ Persistent data storage
- ✅ Auto-restart on failure
- ✅ Easy deployment with Docker
- ✅ Comprehensive logging

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test locally with Docker
5. Submit pull request

## 📝 License

ISC

## 👥 Support

For issues or questions:
1. Check [TROUBLESHOOTING](DEPLOYMENT.md#troubleshooting)
2. Review logs: `logs.bat`
3. Check status: `status.bat`
4. Consult documentation

## 🎉 Acknowledgments

Built with:
- Express.js
- BullMQ
- Redis
- Playwright
- Google APIs
- Docker

---

**Ready to deploy?** Start with [QUICK_START.md](QUICK_START.md)!
