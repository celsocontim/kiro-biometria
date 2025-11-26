# Facial Recognition Capture Application

A full-stack web application for capturing facial images with visual guidance and processing them through a recognition API. Features real-time camera feed, responsive design, and configurable recognition parameters.

## Features

- 📷 Live camera feed with face positioning guide (oval overlay)
- 🎯 Configurable recognition confidence threshold
- 🔄 Automatic retry with attempt tracking
- 📱 Responsive design (mobile, tablet, desktop)
- 🔌 Iframe embedding support with PostMessage API
- ⚙️ Runtime configuration without deployment
- 🧪 Mock recognition service for development/testing

## Project Structure

```
.
├── frontend/              # Next.js 14 frontend application
│   ├── app/              # Next.js app directory (pages)
│   ├── components/       # React components
│   │   ├── CameraFeed.tsx
│   │   ├── FaceOvalGuide.tsx
│   │   ├── CaptureButton.tsx
│   │   ├── FeedbackMessage.tsx
│   │   └── SuccessScreen.tsx
│   ├── services/         # Frontend services
│   │   ├── CameraService.ts
│   │   ├── APIClient.ts
│   │   └── IframeMessenger.ts
│   ├── types/            # TypeScript type definitions
│   └── __tests__/        # Component and service tests
│
├── backend/              # Express backend API
│   ├── src/
│   │   ├── index.ts      # Express app entry point
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic services
│   │   │   ├── ConfigurationService.ts
│   │   │   ├── FailureTrackingService.ts
│   │   │   └── RecognitionService.ts
│   │   └── types/        # TypeScript type definitions
│   └── __tests__/        # Service tests
│
├── .kiro/                # Kiro IDE configuration and specs
├── ERROR_HANDLING.md     # Error handling documentation
├── PERFORMANCE_OPTIMIZATIONS.md
└── SETUP_VERIFICATION.md
```

## Prerequisites

- Node.js 18.17+ (required for Next.js 14)
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
MAX_FAILURE_ATTEMPTS=0
RECOGNITION_THRESHOLD=70
FORCE_FAILURE=false
```

**Frontend** (`frontend/.env.local`):
```bash
cp frontend/.env.local.example frontend/.env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 3. Run Development Servers

**Option A: Run from root directory**
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

**Option B: Run from individual directories**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- With userId parameter: http://localhost:3000?userId=347313

## Configuration Parameters

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Backend server port |
| `FRONTEND_URL` | http://localhost:3000 | Frontend URL for CORS |
| `MAX_FAILURE_ATTEMPTS` | 5 | Max failed attempts before lockout (0 = unlimited) |
| `RECOGNITION_THRESHOLD` | 70 | Confidence threshold (0-100) for recognition |
| `FORCE_FAILURE` | false | Force all recognitions to fail (testing) |
| `RECOGNITION_API_URL` | - | External recognition API URL (optional) |
| `RECOGNITION_API_KEY` | - | External recognition API key (optional) |

### Configuration Behavior

- **MAX_FAILURE_ATTEMPTS = 0**: Unlimited attempts, no user lockout
- **RECOGNITION_THRESHOLD**: Confidence scores >= threshold are "recognized"
- **FORCE_FAILURE = true**: Mock API generates confidence < threshold (always fails)
- **Auto-reload**: Configuration reloads every 60 seconds without restart

## API Endpoints

### Backend

- `GET /health` - Health check
- `GET /api/config` - Get current configuration (debug)
- `POST /api/capture` - Process facial recognition capture

**Capture Request:**
```json
{
  "userId": "string",
  "imageData": "data:image/jpeg;base64,..."
}
```

**Capture Response (Success):**
```json
{
  "success": true,
  "data": {
    "recognized": true,
    "confidence": 85,
    "userId": "347313",
    "timestamp": "2025-11-26T21:00:00.000Z",
    "attemptsRemaining": 99
  }
}
```

**Capture Response (Failure):**
```json
{
  "success": true,
  "data": {
    "recognized": false,
    "confidence": 45,
    "userId": "347313",
    "timestamp": "2025-11-26T21:00:00.000Z",
    "attemptsRemaining": 4
  }
}
```

## Development

### Frontend Development

- Hot-reload enabled for all React components
- TypeScript strict mode
- Tailwind CSS for styling
- Jest + React Testing Library for tests

```bash
cd frontend
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
npm test         # Run tests
```

### Backend Development

- Auto-restart on file changes (ts-node-dev)
- TypeScript strict mode
- Express with CORS
- Jest for tests

```bash
cd backend
npm run dev      # Development server
npm run build    # Production build
npm test         # Run tests
```

## Testing

### Run All Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test
```

### Mock Recognition Service

The backend includes a mock recognition service for development:
- Generates random confidence scores (0-100)
- Simulates API delay (500-1500ms)
- Configurable via `FORCE_FAILURE` parameter

## Production Build

### Frontend

```bash
cd frontend
npm run build
npm start
```

The frontend will be available at http://localhost:3000

### Backend

```bash
cd backend
npm run build
npm start
```

The backend will be available at http://localhost:3001

## Iframe Integration

The application supports iframe embedding with PostMessage communication:

```html
<iframe src="http://localhost:3000?userId=USER_ID" />
```

**PostMessage Events:**
- `facial-recognition-success` - Recognition succeeded
- `facial-recognition-failure` - Max attempts exceeded

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Browser Features:**
- MediaDevices API (camera access)
- ES2017+ JavaScript
- CSS Grid and Flexbox

## Troubleshooting

### Camera Not Working

1. Ensure you're using HTTPS or localhost
2. Grant camera permissions in browser
3. Check if another app is using the camera
4. Verify browser supports MediaDevices API

### CORS Errors

1. Check `FRONTEND_URL` in backend `.env`
2. Ensure frontend is running on the configured port
3. Clear browser cache

### Backend Not Starting

1. Verify Node.js version >= 18.17
2. Check if port 3001 is available
3. Ensure `.env` file exists with valid values

## Documentation

- [Error Handling Guide](ERROR_HANDLING.md)
- [Performance Optimizations](PERFORMANCE_OPTIMIZATIONS.md)
- [Setup Verification](SETUP_VERIFICATION.md)
- [Requirements Specification](.kiro/specs/facial-recognition-capture/requirements.md)
- [Design Document](.kiro/specs/facial-recognition-capture/design.md)

## License

MIT
