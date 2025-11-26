# Project Structure

## Monorepo Layout

```
.
├── frontend/              # Next.js frontend application
├── backend/               # Express backend API
├── .kiro/                 # Kiro configuration and specs
├── .vscode/               # VS Code settings
├── package.json           # Root package.json with workspace scripts
├── README.md              # Project documentation
├── ERROR_HANDLING.md      # Comprehensive error handling guide
├── PERFORMANCE_OPTIMIZATIONS.md  # Performance implementation details
└── SETUP_VERIFICATION.md  # Setup and verification guide
```

## Frontend Structure

```
frontend/
├── app/                   # Next.js App Router
│   ├── page.tsx          # Main page component
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Global styles
│   └── __tests__/        # Page tests
├── components/            # React components
│   ├── CameraFeed.tsx
│   ├── CameraSwitchButton.tsx
│   ├── CaptureButton.tsx
│   ├── ErrorBoundary.tsx
│   ├── FaceOvalGuide.tsx
│   ├── FeedbackMessage.tsx
│   ├── SuccessScreen.tsx
│   └── __tests__/        # Component tests
├── services/              # Frontend services
│   ├── APIClient.ts      # Backend API communication
│   ├── CameraService.ts  # Camera access and capture
│   ├── IframeMessenger.ts # PostMessage communication
│   ├── README.md         # Services documentation
│   └── __tests__/        # Service tests
├── types/                 # TypeScript type definitions
│   ├── api.types.ts      # API request/response types
│   └── camera.types.ts   # Camera-related types
├── .env.local            # Environment variables (gitignored)
├── .env.local.example    # Environment template
├── jest.config.js        # Jest configuration
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Frontend dependencies
```

## Backend Structure

```
backend/
├── src/
│   ├── index.ts          # Express app entry point
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   │   ├── ConfigurationService.ts
│   │   ├── FailureTrackingService.ts
│   │   ├── RecognitionService.ts
│   │   └── __tests__/   # Service tests
│   └── types/            # TypeScript type definitions
│       ├── api.types.ts
│       ├── config.types.ts
│       ├── failure.types.ts
│       └── recognition.types.ts
├── dist/                 # Compiled output (gitignored)
├── .env                  # Environment variables (gitignored)
├── .env.example          # Environment template
├── jest.config.js        # Jest configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Backend dependencies
```

## Architectural Patterns

### Frontend

- **Component Organization**: Components are self-contained with co-located tests in `__tests__/` directories
- **Service Layer**: Business logic separated into service classes (CameraService, APIClient, IframeMessenger)
- **Type Safety**: Shared type definitions in `types/` directory, mirroring backend types
- **Client Components**: All interactive components use `'use client'` directive
- **Error Boundaries**: Top-level ErrorBoundary component catches React errors
- **Custom Hooks**: Reusable hooks like `useViewportDimensions()` for responsive behavior

### Backend

- **Service Layer**: Business logic encapsulated in service classes
  - `ConfigurationService`: Manages app configuration with file watching
  - `FailureTrackingService`: Tracks user attempts and lockouts
  - `RecognitionService`: Handles facial recognition API calls
- **Type Definitions**: Strongly typed request/response contracts
- **Middleware**: Express middleware for CORS, body parsing, error handling
- **Error Handling**: Centralized error handling with consistent response format

## Naming Conventions

### Files
- Components: PascalCase (e.g., `CameraFeed.tsx`)
- Services: PascalCase (e.g., `CameraService.ts`)
- Types: camelCase with `.types.ts` suffix (e.g., `api.types.ts`)
- Tests: Same name as source with `.test.ts` or `.test.tsx` suffix
- Config files: kebab-case or standard names (e.g., `jest.config.js`)

### Code
- Components: PascalCase (e.g., `CameraFeed`)
- Functions/methods: camelCase (e.g., `requestCameraAccess`)
- Interfaces/Types: PascalCase (e.g., `CaptureRequest`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_FAILURE_ATTEMPTS`)
- Private methods: camelCase with underscore prefix (e.g., `_handleError`)

## Test Organization

- Tests are co-located with source files in `__tests__/` directories
- Test files mirror the structure of source files
- Property-based tests use fast-check library
- Unit tests for services, integration tests for components
- Test naming: `describe('ComponentName', () => { it('should...', () => {}) })`

## Documentation

- Inline JSDoc comments for complex functions and services
- Component props documented with TypeScript interfaces
- Requirements referenced in comments (e.g., `// Requirement 1.1: Display live camera feed`)
- Comprehensive guides in root-level markdown files:
  - `ERROR_HANDLING.md`: Error handling patterns and strategies
  - `PERFORMANCE_OPTIMIZATIONS.md`: Performance implementation details
  - `SETUP_VERIFICATION.md`: Setup and verification steps

## Configuration Files

- **TypeScript**: Strict mode enabled, path aliases configured
- **Jest**: Separate configs for frontend (jsdom) and backend (node)
- **Next.js**: CSP headers for iframe embedding, Tailwind integration
- **Tailwind**: Custom breakpoints for responsive design
- **ESLint**: Next.js recommended rules (frontend only)

## Key Principles

1. **Separation of Concerns**: UI components, business logic (services), and types are clearly separated
2. **Type Safety**: Strict TypeScript with shared type definitions between frontend and backend
3. **Testability**: Services and components designed for easy testing with co-located tests
4. **Error Handling**: Comprehensive error handling at all layers with user-friendly messages
5. **Performance**: Optimizations for image compression, network efficiency, and UI responsiveness
6. **Documentation**: Code is self-documenting with clear naming and inline comments
