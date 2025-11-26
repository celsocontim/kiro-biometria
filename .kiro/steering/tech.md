# Technology Stack

## Frontend

- **Framework**: Next.js 14+ (React 18+)
- **Language**: TypeScript 5.0+ with strict mode enabled
- **Styling**: Tailwind CSS 3.4+
- **Testing**: Jest 30+ with React Testing Library and fast-check for property-based testing
- **Build Tool**: Next.js built-in bundler
- **Node Version**: 18.17+ required

### Frontend Configuration

- Path alias: `@/*` maps to project root
- Module resolution: bundler
- JSX: preserve (handled by Next.js)
- Target: ES2017

## Backend

- **Runtime**: Node.js 18+
- **Framework**: Express 4.18+
- **Language**: TypeScript 5.0+ with strict mode enabled
- **Testing**: Jest 30+ with ts-jest and fast-check
- **Dev Server**: ts-node-dev with auto-restart
- **Module System**: CommonJS

### Backend Configuration

- Target: ES2020
- Output directory: `./dist`
- Source maps and declarations enabled
- Module resolution: node

## Key Dependencies

### Frontend
- `next`: ^14.2.0
- `react`: ^18.3.0
- `react-dom`: ^18.3.0
- `tailwindcss`: ^3.4.0

### Backend
- `express`: ^4.18.0
- `cors`: ^2.8.5
- `dotenv`: ^16.4.0

### Shared Dev Dependencies
- `typescript`: ^5.0.0
- `jest`: ^30.2.0
- `fast-check`: ^4.3.0 (property-based testing)

## Common Commands

### Root Level
```bash
# Frontend development
npm run dev:frontend

# Backend development
npm run dev:backend

# Build frontend
npm run build:frontend

# Build backend
npm run build:backend

# Start production frontend
npm run start:frontend

# Start production backend
npm run start:backend
```

### Frontend (cd frontend)
```bash
# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint
```

### Backend (cd backend)
```bash
# Development server with auto-restart (http://localhost:3001)
npm run dev

# Production build (outputs to dist/)
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Backend (.env)
```
PORT=3001
FRONTEND_URL=http://localhost:3000
MAX_FAILURE_ATTEMPTS=5
```

## Build Output

- **Frontend**: `.next/` directory (Next.js build output)
- **Backend**: `dist/` directory (compiled JavaScript)

## Testing

- Test files located in `__tests__/` directories adjacent to source files
- Test file naming: `*.test.ts` or `*.test.tsx`
- Run tests with `--runInBand` flag to avoid concurrency issues
- Property-based testing with fast-check for robust validation
