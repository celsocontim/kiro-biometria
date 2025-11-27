# Facial Recognition Capture Application

A full-stack web application for capturing facial images with real-time liveness detection and user identification. Features live camera feed, responsive design, and configurable recognition parameters with integration to facial recognition APIs.

## Features

- 📷 Full-screen live camera feed with face positioning guide
- 🎯 Real-time liveness detection (anti-spoofing)
- 👤 User identification with confidence scoring
- 🔄 Configurable attempt tracking (unlimited or limited)
- 📱 Fully responsive design (mobile, tablet, desktop)
- 🔌 Iframe embedding support with PostMessage API
- ⚙️ Runtime configuration without deployment
- 🧪 Mock mode for development/testing

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
│   └── types/            # TypeScript type definitions
│
├── backend/              # Express backend API
│   ├── src/
│   │   ├── index.ts      # Express app entry point
│   │   ├── routes/       # API route handlers
│   │   └── services/     # Business logic services
│   │       ├── ConfigurationService.ts
│   │       ├── FailureTrackingService.ts
│   │       └── RecognitionService.ts
│   └── types/            # TypeScript type definitions
│
└── .kiro/                # Kiro IDE configuration and specs
```

## Prerequisites

- Node.js 18.17+ (required for Next.js 14)
- npm or yarn
- Modern browser with camera support

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
PORT=4000
FRONTEND_URL=http://localhost:3000
MAX_FAILURE_ATTEMPTS=0
RECOGNITION_THRESHOLD=70
USE_MOCK=false
FACE_API_URL=your-face-api-url-here
FACE_API_KEY=your-face-api-key-here
```

**Frontend** (`frontend/.env.local`):
```bash
cp frontend/.env.local.example frontend/.env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 3. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- With userId parameter: http://localhost:3000?userId=YOUR_USER_ID

## Configuration Parameters

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Backend server port |
| `FRONTEND_URL` | http://localhost:3000 | Frontend URL for CORS |
| `MAX_FAILURE_ATTEMPTS` | 0 | Max failed attempts before lockout (0 = unlimited) |
| `RECOGNITION_THRESHOLD` | 70 | Confidence threshold (0-100) for recognition |
| `USE_MOCK` | false | Use mock recognition instead of real API |
| `FACE_API_URL` | - | Facial recognition API endpoint URL |
| `FACE_API_KEY` | - | Facial recognition API authentication key |

### Configuration Behavior

- **MAX_FAILURE_ATTEMPTS = 0**: Unlimited attempts, no user lockout, attempts shown as 99
- **RECOGNITION_THRESHOLD**: Confidence scores >= threshold are "recognized"
- **USE_MOCK = true**: Uses mock API with random confidence scores
- **USE_MOCK = false**: Uses real facial recognition API
- **Auto-reload**: Configuration reloads every 60 seconds without restart

## API Endpoints

### Backend

- `GET /health` - Health check
- `GET /api/config` - Get current configuration (debug)
- `POST /api/user` - Check if user is registered
- `POST /api/register` - Register new user with facial data
- `POST /api/capture` - Process facial recognition identification

**User Check Request:**
```json
{
  "user_id": "string"
}
```

**User Check Response:**
```json
{
  "registered": true,
  "timestamp": "2025-11-27T..."
}
```

**Register Request:**
```json
{
  "user_id": "string",
  "imageData": "data:image/jpeg;base64,..."
}
```

**Register Response (Success):**
```json
{
  "success": true,
  "timestamp": "2025-11-27T..."
}
```

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
    "confidence": 95,
    "userId": "347313",
    "timestamp": "2025-11-27T...",
    "attemptsRemaining": 99
  }
}
```

**Capture Response (Spoof Detected):**
```json
{
  "success": false,
  "error": "Spoof attempt! Make sure to use a real face!",
  "errorCode": "LIVENESS_CHECK_ERROR"
}
```

## Recognition Flow

The application supports both user registration and identification with automatic detection:

### On Page Load: Registration Check
1. Frontend calls `POST /api/user` with user_id
2. Backend queries Face API to check if user exists
3. Result stored in local state (`isRegistered`)

### When Photo is Captured

**For Unregistered Users (Registration Flow):**
1. Capture image from camera
2. Call `POST /api/register` with user_id and image
3. Backend creates user in Face API
4. Backend adds facial credential (template) to user with liveness detection
5. If spoof detected: User is deleted, error returned to frontend
6. On success: Show success screen and notify parent window
7. On failure: Error message shown, user can retry

**For Registered Users (Identification Flow):**
1. Capture image from camera
2. Call `POST /api/capture` with user_id and image
3. Backend performs two-step verification via Face API:
   - **Step 1: Liveness Detection (Extract)** - Detects spoofing attempts (photos, videos, masks)
   - **Step 2: User Identification (Identify)** - Matches face against registered user
4. If spoof detected: Error returned to frontend
5. On success: Show success screen and notify parent window
6. On failure: User can retry (up to max attempts if configured)

**Success Criteria:**
- ✅ Registration: User created and credential added successfully (liveness check passes)
- ✅ Identification: Liveness check passes + User ID matches + Confidence >= threshold

**Spoof Detection:**
- Both registration and identification include liveness detection
- Prevents photos, videos, masks, and other spoofing attempts
- Clear error messages guide users to use real faces
- Logged for security monitoring

## Development

### Frontend Development

```bash
cd frontend
npm run dev      # Development server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
npm test         # Run tests
```

### Backend Development

```bash
cd backend
npm run dev      # Development server (port 4000)
npm run build    # Production build
npm test         # Run tests
```

## Features in Detail

### Full-Screen Camera Feed
- Camera feed fills entire viewport
- Responsive oval guide for face positioning
- User ID displayed in upper-left corner
- Dynamic text sizing based on screen size

### Liveness Detection
- Real-time spoof detection
- Prevents photos, videos, and masks
- Clear error messages for spoof attempts
- Logged warnings for security monitoring

### Feedback System
- Success messages auto-dismiss after 3 seconds
- Error messages auto-dismiss after 10 seconds
- Manual dismiss option available
- Attempt counter (when enabled)

### Responsive Design
- Mobile: Full-screen with touch-optimized controls
- Tablet: Full-screen with larger buttons
- Desktop: Full-screen with keyboard support

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
2. Check if port 4000 is available
3. Ensure `.env` file exists with valid values

### Spoof Detection Issues

1. Ensure `USE_MOCK=false` in backend `.env`
2. Verify facial recognition API credentials are configured
3. Check backend console for "Spoof attempt!" warnings
4. Ensure proper lighting for camera

## Security Features

- Liveness detection prevents spoofing
- Configurable attempt limits
- User lockout after max attempts
- Secure HTTPS requirement for camera access
- CORS protection
- Request validation
- Error logging for security monitoring

## Documentation

- [Error Handling Guide](ERROR_HANDLING.md)
- [Performance Optimizations](PERFORMANCE_OPTIMIZATIONS.md)
- [Setup Verification](SETUP_VERIFICATION.md)
- [Requirements Specification](.kiro/specs/facial-recognition-capture/requirements.md)
- [Design Document](.kiro/specs/facial-recognition-capture/design.md)

## License

MIT
