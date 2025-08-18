import cors from 'cors';

// CORS configuration to allow all origins
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  credentials: false, // Set to false when using wildcard origin
  optionsSuccessStatus: 200 // For legacy browser support
};

// Create CORS middleware
const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
