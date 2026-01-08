# LMS Automation Backend - Docker Deployment Guide

## Prerequisites

1. **Docker Desktop** - Already installed on your Windows machine
2. **Google OAuth Credentials** - Already configured in `.env` file
3. **LMS Credentials** - Already configured in `config.json` file

---

## Quick Start - 3 Simple Steps

### Step 1: Start Docker Desktop
1. Open Docker Desktop application
2. Wait until it shows "Docker Desktop is running"

### Step 2: Deploy the Application
Double-click `start.bat` file

This will:
- Build all Docker images (takes 5-10 minutes first time)
- Start Redis server
- Start API server
- Start all worker services

### Step 3: Complete Google OAuth Setup
1. Open browser and visit: http://localhost:8000/test
2. The app will automatically redirect you to Google OAuth
3. Login and grant permissions
4. You'll be redirected back and see "Tokens saved successfully"

**Done! Your application is now running.**

---

## Services Running

After successful deployment, these services will be running:

| Service | Type | Container Name | Purpose |
|---------|------|---------------|---------|
| API Server | Web | lms_api | REST API endpoints |
| Redis | Database | lms_redis | Queue & cache backend |
| Clone Worker | Worker | lms_clone_worker | Assessment cloning |
| Assignment Worker | Worker | lms_assignment_worker | Assignment creation |
| Lecture Worker | Worker | lms_lecture_worker | Lecture creation |
| Notes Worker | Worker | lms_notes_worker | Notes updates |

---

## Management Scripts

### Start the Application
```bash
start.bat
```
Builds and starts all services.

### Stop the Application
```bash
stop.bat
```
Stops all services gracefully.

### View Logs
```bash
logs.bat
```
Shows real-time logs from all services. Press Ctrl+C to exit.

### Check Status
```bash
status.bat
```
Shows which services are running.

### Restart Services
```bash
restart.bat
```
Restarts all services without rebuilding.

---

## Accessing the Application

### API Endpoints
- **Base URL**: http://localhost:8000
- **Test Endpoint**: http://localhost:8000/test
- **OAuth Callback**: http://localhost:8000/oauth2callback

### API Documentation

#### Configuration Endpoints
- `POST /config/save` - Save LMS credentials
- `GET /config/read` - Read stored credentials
- `POST /config/reset` - Reset credentials

#### Automation Endpoints
- `POST /api/add-data?type=assignments` - Load assignments from Google Sheets
- `POST /api/add-data?type=lectures` - Load lectures from Google Sheets
- `POST /api/clone-assessment-template` - Start assessment cloning
- `POST /api/create-assignments` - Start assignment creation
- `POST /api/create-lectures` - Start lecture creation
- `POST /api/start-update-notes` - Start notes updates
- `GET /api/get-automation-status?type=assignments` - Get status
- `GET /api/get-automation-status?type=lectures` - Get status
- `PATCH /api/update-automation-status` - Update status manually
- `DELETE /api/cleardata?type=assignments` - Clear data
- `DELETE /api/cleardata?type=lectures` - Clear data

---

## Usage Workflow

### 1. Load Data from Google Sheets

```bash
# Load assignments
curl -X POST "http://localhost:8000/api/add-data?type=assignments"

# Load lectures
curl -X POST "http://localhost:8000/api/add-data?type=lectures"
```

### 2. Process Assignments (3 steps)

```bash
# Step 1: Clone assessments
curl -X POST "http://localhost:8000/api/clone-assessment-template"

# Step 2: Create assignments (wait for cloning to finish)
curl -X POST "http://localhost:8000/api/create-assignments"

# Step 3: Update notes (wait for assignments to finish)
curl -X POST "http://localhost:8000/api/start-update-notes"
```

### 3. Process Lectures

```bash
# Create lectures
curl -X POST "http://localhost:8000/api/create-lectures"
```

### 4. Check Status

```bash
# Check assignment status
curl "http://localhost:8000/api/get-automation-status?type=assignments"

# Check lecture status
curl "http://localhost:8000/api/get-automation-status?type=lectures"
```

---

## Docker Commands (Manual)

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f clone_worker
docker-compose logs -f assignment_worker
docker-compose logs -f lecture_worker
```

### Rebuild After Code Changes
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

### Check Service Status
```bash
docker-compose ps
```

### Execute Commands in Container
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Access API container shell
docker-compose exec api sh
```

---

## Troubleshooting

### Problem: Docker Desktop not running
**Solution**: Start Docker Desktop application and wait for it to fully start.

### Problem: Port 8000 already in use
**Solution**:
1. Stop the application using the port
2. Or change PORT in `.env` file to another port (e.g., 8080)
3. Rebuild: `docker-compose down && docker-compose up -d`

### Problem: Services not starting
**Solution**:
1. Check logs: `logs.bat`
2. Check Docker Desktop has enough resources (Settings > Resources)
3. Restart Docker Desktop

### Problem: OAuth not working
**Solution**:
1. Ensure `tokens.json` exists
2. Visit http://localhost:8000/test to re-authenticate
3. Check `.env` file has correct Google credentials

### Problem: Workers not processing jobs
**Solution**:
1. Check Redis is running: `docker-compose exec redis redis-cli ping`
2. Check worker logs: `docker-compose logs -f clone_worker`
3. Restart workers: `docker-compose restart clone_worker assignment_worker lecture_worker`

### Problem: Playwright browser not working
**Solution**:
1. Increase Docker memory limit (Docker Desktop > Settings > Resources > Memory > 4GB+)
2. Rebuild image: `docker-compose build`

### Problem: "Out of memory" errors
**Solution**:
1. Go to Docker Desktop > Settings > Resources
2. Increase Memory to at least 6GB
3. Restart Docker Desktop

---

## Data Persistence

### Persistent Data
The following data persists even after stopping containers:
- **Redis data** - Stored in Docker volume `redis_data`
- **config.json** - Mounted from host
- **tokens.json** - Mounted from host
- **.env** - Mounted from host

### Clearing All Data
```bash
# Stop and remove everything including volumes
docker-compose down -v

# Remove all Docker images
docker image prune -a
```

---

## System Requirements

### Minimum
- Windows 10/11
- Docker Desktop installed
- 4GB RAM
- 10GB free disk space

### Recommended
- Windows 11
- Docker Desktop with WSL2
- 8GB+ RAM
- 20GB free disk space
- SSD for better performance

---

## Auto-Start on Windows Boot

To make the application start automatically when Windows starts:

1. Press `Win + R`
2. Type `shell:startup` and press Enter
3. Create a shortcut to `start.bat` in this folder
4. Rename shortcut to "LMS Automation Backend"

Now the application will start automatically when you login to Windows.

---

## Stopping on Windows Shutdown

The containers will automatically stop when you shutdown Windows or stop Docker Desktop.

---

## Updating the Application

When you pull new code from Git:

```bash
# Stop services
stop.bat

# Rebuild with new code
docker-compose build

# Start services
start.bat
```

---

## Monitoring

### View System Resources
```bash
docker stats
```

Shows CPU, memory, and network usage for each container.

### View Container Health
```bash
docker-compose ps
```

### Check Redis Connection
```bash
docker-compose exec redis redis-cli ping
# Should return: PONG
```

### Check API Health
```bash
curl http://localhost:8000/test
# Should return: "This is a test route"
```

---

## Security Notes

1. **Never commit sensitive files** to Git:
   - `.env`
   - `config.json`
   - `tokens.json`

2. **Firewall**: Docker containers are only accessible from localhost by default.

3. **Production**: If deploying to a server, add:
   - HTTPS/SSL certificates
   - Authentication middleware
   - Rate limiting
   - Environment-specific configs

---

## Support

For issues or questions:
1. Check logs: `logs.bat`
2. Check status: `status.bat`
3. Restart: `restart.bat`
4. Review this documentation

---

## Summary

**Lifetime Free Deployment**: This Docker setup runs completely free on your local machine with no recurring costs. All services run in isolated containers with automatic restart on failure.

**Daily Usage**:
1. Start Docker Desktop (if not already running)
2. Run `start.bat` (only needed once)
3. Use the API endpoints
4. Run `stop.bat` when done (or leave running)

**The application will automatically restart if your computer reboots** (if you set up auto-start).
