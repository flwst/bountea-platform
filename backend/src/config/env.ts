// src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().default('3000'),
  
  // Network
  NETWORK_TYPE: z.enum(['testnet', 'mainnet']).default('testnet'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Blockchain (UPDATED terminology)
  PLATFORM_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  PLATFORM_TREASURY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  
  // AI Services (NEW)
  SCRAPECREATORS_API_KEY: z.string().min(1),
  AI_ANALYSIS_API_KEY: z.string().min(1),
  AI_ANALYSIS_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  AI_COST_LIMIT_USD: z.string().default('1000'),
  
  // APIs
  YOUTUBE_API_KEY: z.string().min(1),
  
  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('7d'),
  
  // Email
  SENDGRID_API_KEY: z.string().min(1),
  FROM_EMAIL: z.string().email(),
  
  // URLs
  FRONTEND_URL: z.string().url(),
  BACKEND_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;