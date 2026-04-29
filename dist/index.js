import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import authRouter from './routes/auth.js';
import profilesRouter from './routes/profiles.js';
import { authLimiter, apiLimiter } from './middleware/rateLimiter.js';
const app = express();
const PORT = process.env['PORT'] || 3001;
const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3000').split(',');
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin))
            return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
// Request logging: method endpoint status response-time
app.use(morgan(':method :url :status :response-time ms'));
app.use('/auth', authLimiter, authRouter);
app.use('/api/profiles', apiLimiter, profilesRouter);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//# sourceMappingURL=index.js.map