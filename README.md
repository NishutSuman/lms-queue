# LMS Automation Queue System

Automated system for creating lectures, assignments, and cloning assessments on Masai LMS platform using Playwright browser automation and BullMQ job queues.

## Project Structure

```
lms-queue/
├── backend/          # Node.js backend with BullMQ workers
│   ├── utils/        # Playwright automation scripts
│   ├── routes/       # Express API routes
│   ├── configs/      # Redis, Google Sheets, BullMQ configs
│   └── docker-compose.yml
├── frontend/         # React + Vite UI for managing automations
└── README.md
```

## Features

- **Lecture Creation**: Automated lecture scheduling on LMS
- **Assignment Creation**: Automated assignment creation with templates
- **Assessment Cloning**: Clone and rename assessment templates
- **Notes Update**: Bulk update lecture notes
- **Queue Management**: BullMQ-based job processing with Redis
- **Google Sheets Integration**: Read/write automation data from Google Sheets

## Tech Stack

**Backend:**
- Node.js + Express
- Playwright (browser automation)
- BullMQ (job queues)
- Redis (queue storage)
- Google Sheets API
- Docker + Docker Compose

**Frontend:**
- React 18
- Vite
- TailwindCSS
- Axios

## Setup

### Prerequisites
- Node.js 20+
- Docker Desktop
- Google Cloud Project with Sheets API enabled

### Backend Setup

1. Navigate to backend:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```
   PORT=8000
   REDIS_HOST=localhost
   REDIS_PORT=6379
   HEADLESS=false
   MASAI_LMS_PLATFORM_URL=https://experience-admin.masaischool.com/login
   MASAI_ASSESS_PLATFORM_URL=https://assess-admin.masaischool.com/login
   ```

4. Add Google OAuth credentials:
   - Place `credentials.json` in `backend/` directory
   - Run authentication flow to generate `tokens.json`

5. Start with Docker:
   ```bash
   docker-compose up -d
   ```

### Frontend Setup

1. Navigate to frontend:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure `.env`:
   ```
   VITE_API_URL=http://localhost:8000
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Usage

1. Prepare Google Sheet with assignment/lecture data
2. Upload data via frontend UI
3. Clone assessments (for assignments)
4. Create assignments/lectures
5. Monitor progress in real-time

## Docker Services

- `redis`: Redis 7 (queue storage)
- `api`: Express API server
- `assignment_worker`: Assignment creation worker
- `lecture_worker`: Lecture creation worker
- `clone_worker`: Assessment cloning worker
- `notes_worker`: Notes update worker

## API Endpoints

- `POST /api/add-data?type=assignments|lectures` - Upload data from Google Sheets
- `POST /api/clone-assessment-template` - Queue assessment cloning
- `POST /api/create-assignments` - Queue assignment creation
- `POST /api/create-lectures` - Queue lecture creation
- `POST /api/start-update-notes` - Queue notes update
- `GET /api/get-automation-status?type=assignments|lectures` - Get status
- `PATCH /api/update-automation-status` - Update individual status
- `DELETE /api/cleardata?type=assignments|lectures` - Clear all data

## Development

### Branch Strategy
- `main` - Production-ready code
- `development` - Active development
- `feature/*` - Feature branches

### Making Changes

1. Create feature branch from `development`:
   ```bash
   git checkout development
   git checkout -b feature/your-feature-name
   ```

2. Make changes and commit:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push and create PR:
   ```bash
   git push origin feature/your-feature-name
   ```

## License

Private - Internal use only
