# Quick Start Guide - LMS Automation Backend

## 🚀 Deploy in 3 Simple Steps

### Step 1: Start Docker Desktop ✅

1. Open **Docker Desktop** from Start Menu or Desktop icon
2. Wait for Docker to fully start (bottom left shows "Docker Desktop is running")
3. You'll see a green icon when it's ready

**First time setup**: Docker Desktop will ask to use WSL2. Click "OK" and let it install.

---

### Step 2: Deploy Application 🐳

1. Go to project folder:
   ```
   c:\Users\nishu\OneDrive\Documents\GITHUB\lms_automations_backend
   ```

2. **Double-click** `start.bat`

3. Wait 5-10 minutes for first-time setup:
   - ⏳ Building Docker images...
   - ⏳ Downloading dependencies...
   - ⏳ Installing Playwright browsers...
   - ✅ Starting services...

4. When you see "All services started successfully!", press any key

---

### Step 3: Setup Google OAuth 🔐

1. Open browser and visit: **http://localhost:8000/test**

2. You'll be redirected to Google login

3. Login with your Google account

4. Grant permissions

5. You'll see: **"✅ Tokens saved successfully. You can now close this tab."**

---

## ✅ You're Done!

Your application is now running 24/7 on your machine.

---

## 📝 Daily Usage

### Option 1: Using Batch Files (Easiest)

**To start:**
```
Double-click start.bat
```

**To stop:**
```
Double-click stop.bat
```

**To view logs:**
```
Double-click logs.bat
```

**To check status:**
```
Double-click status.bat
```

---

### Option 2: Using API Endpoints

#### Load Data from Google Sheets
Open PowerShell in project folder and run:

```powershell
# Load assignments
Invoke-WebRequest -Method POST "http://localhost:8000/api/add-data?type=assignments"

# Load lectures
Invoke-WebRequest -Method POST "http://localhost:8000/api/add-data?type=lectures"
```

#### Process Assignments (2-step workflow)

```powershell
# Step 1: Clone assessments
Invoke-WebRequest -Method POST "http://localhost:8000/api/clone-assessment-template"

# Step 2: Create assignments (after cloning finishes)
Invoke-WebRequest -Method POST "http://localhost:8000/api/create-assignments"
```

#### Process Lectures

```powershell
# Step 1: Create lectures
Invoke-WebRequest -Method POST "http://localhost:8000/api/create-lectures"

# Step 2: Update notes on existing lectures (fill lecture_id + notes columns first)
Invoke-WebRequest -Method POST "http://localhost:8000/api/start-update-notes"
```

#### Check Status

```powershell
# Check assignment status
Invoke-WebRequest "http://localhost:8000/api/get-automation-status?type=assignments"

# Check lecture status
Invoke-WebRequest "http://localhost:8000/api/get-automation-status?type=lectures"
```

---

### Option 3: Using Postman/Insomnia

Import these endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `http://localhost:8000/api/add-data?type=assignments` | Load assignments |
| POST | `http://localhost:8000/api/add-data?type=lectures` | Load lectures |
| POST | `http://localhost:8000/api/clone-assessment-template` | Clone assessments |
| POST | `http://localhost:8000/api/create-assignments` | Create assignments |
| POST | `http://localhost:8000/api/create-lectures` | Create lectures |
| POST | `http://localhost:8000/api/start-update-notes` | Update notes on existing lectures |
| GET | `http://localhost:8000/api/get-automation-status?type=assignments` | Check status |
| GET | `http://localhost:8000/api/get-automation-status?type=lectures` | Check status |

---

## 🎯 Complete Workflow Example

### For Assignments:

1. **Load data from Google Sheets:**
   ```powershell
   Invoke-WebRequest -Method POST "http://localhost:8000/api/add-data?type=assignments"
   ```

2. **Clone assessments (watch browser automation):**
   ```powershell
   Invoke-WebRequest -Method POST "http://localhost:8000/api/clone-assessment-template"
   ```
   - Open `logs.bat` to watch progress
   - Wait until all cloning is complete (watch logs)

3. **Create assignments:**
   ```powershell
   Invoke-WebRequest -Method POST "http://localhost:8000/api/create-assignments"
   ```
   - Wait until complete

4. **Check final status:**
   ```powershell
   Invoke-WebRequest "http://localhost:8000/api/get-automation-status?type=assignments"
   ```

### For Lectures:

1. **Load data:**
   ```powershell
   Invoke-WebRequest -Method POST "http://localhost:8000/api/add-data?type=lectures"
   ```

2. **Create lectures:**
   ```powershell
   Invoke-WebRequest -Method POST "http://localhost:8000/api/create-lectures"
   ```
   - Wait until complete

3. **Update notes on existing lectures** *(optional — fill `lecture_id` and `notes` columns first)*:
   ```powershell
   Invoke-WebRequest -Method POST "http://localhost:8000/api/start-update-notes"
   ```
   - Finds each lecture on LMS by `lecture_id`, opens edit page, pastes notes
   - Skips lectures where `isNotesUpdated` is already `yes`

4. **Check status:**
   ```powershell
   Invoke-WebRequest "http://localhost:8000/api/get-automation-status?type=lectures"
   ```

---

## 📋 Google Sheet Column Reference

### Assignment Sheet (`assignment` tab)

| Column | Required | Description |
|--------|----------|-------------|
| `title` | ✅ | Assignment title |
| `type` | ✅ | Assignment / Practice / Evaluation |
| `category` | ✅ | DSA / Coding / etc. |
| `module` | ✅ | Module name |
| `tags` | ✅ | Comma-separated tags |
| `platforms` | ✅ | LMS / Assess / etc. |
| `assess_client` | ✅ | Masai LMS / Masai One / etc. |
| `assessment_template_name` | ✅ | New name for cloned assessment |
| `previous_assessment_templateName` | ✅ | Source template to clone from |
| `batch` | ✅ | Batch name |
| `section` | ✅ | Section name (must match exactly) |
| `associated_lecture` | ❌ | Linked lecture title (optional) |
| `startDate` | ✅ | DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD |
| `startTime` | ✅ | HH:MM (24-hour) |
| `endDate` | ✅ | DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD |
| `endTime` | ✅ | HH:MM (24-hour) |
| `showScore` | ❌ | yes / no (optional) |
| `instruction` | ❌ | Assignment instructions (optional) |
| `redisId` | auto | Written by system — do not fill |
| `isCloned` | auto | yes / no — written by system |
| `isAssignmentCreated` | auto | yes / no — written by system |
| `assessmentCloneError` | auto | Error details — written by system |
| `assignmentCreationError` | auto | Error details — written by system |

### Lecture Sheet (`lecture` tab)

| Column | Required | Description |
|--------|----------|-------------|
| `title` | ✅ | Lecture title |
| `type` | ✅ | Lecture / Tutorial / etc. |
| `category` | ✅ | DSA / Coding / etc. |
| `module` | ✅ | Module name |
| `tags` | ✅ | Comma-separated tags |
| `host_name` | ✅ | Instructor name |
| `batch` | ✅ | Batch name |
| `section` | ✅ | Section name (must match exactly) |
| `associated_lecture` | ❌ | Linked lecture title (optional) |
| `startDate` | ✅ | DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD |
| `startTime` | ✅ | HH:MM (24-hour) |
| `lecture_id` | ✅* | LMS ID of existing lecture — needed for Update Notes |
| `notes` | ✅* | Notes content to paste — needed for Update Notes |
| `redisId` | auto | Written by system — do not fill |
| `isLectureCreated` | auto | yes / no — written by system |
| `isNotesUpdated` | auto | yes / no — written by system |
| `lectureCreationError` | auto | Error details — written by system |

> ✅* = Required only when using the **Update Notes** feature

---

## 🔧 Troubleshooting

### "Docker is not running"
- Start Docker Desktop application
- Wait for green status indicator

### "Port 8000 already in use"
- Run `stop.bat` first
- Or change PORT in `.env` file

### Workers not processing
- Run `logs.bat` to see what's happening
- Run `restart.bat` to restart services

### OAuth expired
- Visit http://localhost:8000/test again
- Re-authenticate with Google

---

## 📊 Monitoring

### Watch Real-Time Logs
```
Double-click logs.bat
```

You'll see:
- API requests
- Worker progress
- Browser automation steps
- Redis operations
- Errors (if any)

### Check Service Health
```
Double-click status.bat
```

Shows which services are running:
- ✅ Redis: RUNNING
- ✅ API: RUNNING
- Container status

---

## 🛑 Stopping the Application

### Temporary Stop (keeps data)
```
Double-click stop.bat
```

### Complete Cleanup (removes everything)
```powershell
docker-compose down -v
docker image prune -a
```

---

## 💡 Tips

1. **Keep Docker Desktop running** in the background for automatic restarts

2. **Auto-start on boot**:
   - Press `Win + R`
   - Type `shell:startup`
   - Create shortcut to `start.bat` there

3. **Monitor progress**:
   - Keep `logs.bat` open during automation
   - Watch browser windows pop up

4. **Resource usage**:
   - Each worker needs ~1-2GB RAM
   - Playwright browsers need CPU
   - Set Docker Desktop memory to 6-8GB (Settings > Resources)

---

## ❓ Common Questions

**Q: Does this cost money?**
A: No! 100% free running on your local machine.

**Q: Do I need internet?**
A: Yes, for accessing Google Sheets and LMS platforms.

**Q: Can I use my computer while it runs?**
A: Yes, but browser automation will open windows.

**Q: What if I restart my computer?**
A: Just run `start.bat` again (or set up auto-start).

**Q: Is my data safe?**
A: Yes, everything runs locally. No data leaves your machine except to LMS platforms.

---

## 📁 Important Files

| File | Purpose | Edit? |
|------|---------|-------|
| `.env` | Environment config | ✅ Yes (if needed) |
| `config.json` | LMS credentials | ✅ Yes (via API) |
| `tokens.json` | Google OAuth | ❌ Auto-generated |
| `start.bat` | Start services | ❌ No |
| `stop.bat` | Stop services | ❌ No |
| `logs.bat` | View logs | ❌ No |
| `docker-compose.yml` | Service config | ⚠️ Advanced only |

---

## 🎉 Success Indicators

You know it's working when:
- ✅ `status.bat` shows all services running
- ✅ http://localhost:8000/test responds
- ✅ Browser windows open during automation
- ✅ Logs show "Job completed" messages
- ✅ Google Sheets get updated with status

---

## 📞 Need Help?

1. Check logs: `logs.bat`
2. Check status: `status.bat`
3. Restart: `restart.bat`
4. Read full docs: `DEPLOYMENT.md`

---

## 🎯 Next Steps

1. ✅ Complete Step 1-3 above
2. Test with sample data
3. Configure your Google Sheets
4. Run your first automation
5. Set up auto-start (optional)

**You're ready to go! 🚀**
