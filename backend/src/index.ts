import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ConfigurationService } from './services/ConfigurationService';
import { RecognitionService } from './services/RecognitionService';
import { FailureTrackingService } from './services/FailureTrackingService';
import { handleCapture } from './routes/capture';
import { handleUserCheck } from './routes/user';
import { handleRegister } from './routes/register';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Initialize services
const configService = new ConfigurationService();
const recognitionService = new RecognitionService();
const failureTrackingService = new FailureTrackingService(configService);

// Start auto-reload with 60 second interval
configService.startAutoReload(60000);

// Export for use in other modules
export { configService, recognitionService, failureTrackingService };

// CORS configuration to allow frontend communication
// Allow multiple origins for development (ports 3000, 3001, 3002)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser middleware with error handling
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: any) => {
  const startTime = Date.now();
  
  // Log request details if DEBUG_LOGGING is enabled
  if (process.env.DEBUG_LOGGING === 'true') {
    console.log('\n========== INCOMING REQUEST ==========');
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
      // Don't log full image data, just metadata
      const bodyLog = { ...req.body };
      if (bodyLog.imageData) {
        bodyLog.imageData = `[IMAGE_DATA: ${bodyLog.imageData.substring(0, 50)}... (${bodyLog.imageData.length} chars)]`;
      }
      console.log('Body:', JSON.stringify(bodyLog, null, 2));
    }
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('======================================\n');
  }
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    if (process.env.DEBUG_LOGGING === 'true') {
      console.log('\n========== OUTGOING RESPONSE ==========');
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Duration: ${duration}ms`);
      try {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('Response:', JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log('Response:', data);
      }
      console.log('=======================================\n');
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

// Error handler for body parser
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('[Server] JSON parsing error:', {
      error: err.message,
      url: req.url,
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      errorCode: 'INVALID_REQUEST'
    });
  }
  
  if (err.type === 'entity.too.large') {
    console.error('[Server] Request too large:', {
      url: req.url,
      timestamp: new Date().toISOString()
    });
    
    return res.status(413).json({
      success: false,
      error: 'Request body too large. Maximum size is 2MB.',
      errorCode: 'INVALID_REQUEST'
    });
  }
  
  next(err);
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Configuration endpoint (for testing/debugging)
app.get('/api/config', async (req: Request, res: Response) => {
  try {
    const config = await configService.getConfiguration();
    // Don't expose sensitive keys in response
    res.json({
      maxFailureAttempts: config.maxFailureAttempts,
      failureResetOnSuccess: config.failureResetOnSuccess,
      captureTimeout: config.captureTimeout,
      recognitionApiUrl: config.recognitionApiUrl ? '[CONFIGURED]' : '[NOT SET]'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

// Capture endpoint
app.post('/api/capture', async (req: Request, res: Response) => {
  await handleCapture(req, res, recognitionService, failureTrackingService, configService);
});

// User check endpoint
app.post('/api/user', async (req: Request, res: Response) => {
  const config = await configService.getConfiguration();
  await handleUserCheck(req, res, config.faceApiUrl, config.faceApiKey);
});

// User registration endpoint
app.post('/api/register', async (req: Request, res: Response) => {
  const config = await configService.getConfiguration();
  await handleRegister(req, res, config.faceApiUrl, config.faceApiKey, failureTrackingService, configService);
});

// 404 handler for unknown routes
app.use((req: Request, res: Response) => {
  console.warn('[Server] 404 - Route not found:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
    errorCode: 'NOT_FOUND'
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[Server] Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    errorCode: 'SERVER_ERROR'
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('[Server] Uncaught exception:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Give time for logs to flush, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[Server] Unhandled promise rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, async () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          SERVIDOR DE RECONHECIMENTO FACIAL                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`⚡️ Servidor rodando em: http://localhost:${port}`);
  console.log(`📚 Documentação API: http://localhost:${port}/api-docs (se configurado)`);
  console.log(`\n🔧 CONFIGURAÇÕES:`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DEBUG_LOGGING: ${process.env.DEBUG_LOGGING || 'false'}`);
  console.log(`   USE_MOCK: ${process.env.USE_MOCK || 'false'}`);
  console.log(`   MAX_FAILURE_ATTEMPTS: ${process.env.MAX_FAILURE_ATTEMPTS || '0'}`);
  console.log(`   FAILURE_RECORD_TTL: ${process.env.FAILURE_RECORD_TTL || '2'} minutos`);
  console.log(`   RECOGNITION_THRESHOLD: ${process.env.RECOGNITION_THRESHOLD || '70'}`);
  console.log(`\n🌐 CORS habilitado para:`);
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
  
  // Load and display current config
  try {
    const config = await configService.getConfiguration();
    console.log(`\n📋 CONFIGURAÇÃO CARREGADA:`);
    console.log(`   Max Failure Attempts: ${config.maxFailureAttempts}`);
    console.log(`   Recognition Threshold: ${config.recognitionThreshold}`);
    console.log(`   Use Mock: ${config.useMock}`);
    console.log(`   Face API URL: ${config.faceApiUrl ? '✓ Configurado' : '✗ Não configurado'}`);
    console.log(`   Face API Key: ${config.faceApiKey ? '✓ Configurado' : '✗ Não configurado'}`);
  } catch (error) {
    console.log(`\n⚠️  Erro ao carregar configuração inicial`);
  }
  
  console.log('\n════════════════════════════════════════════════════════════\n');
  
  if (process.env.DEBUG_LOGGING === 'true') {
    console.log('🔍 DEBUG_LOGGING ATIVADO - Logs detalhados serão exibidos\n');
  } else {
    console.log('ℹ️  Para logs detalhados, defina DEBUG_LOGGING=true no .env\n');
  }
});

export default app;
