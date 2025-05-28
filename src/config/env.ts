import 'dotenv/config';
import * as joi from 'joi';

// Definir módulos de esquema para diferentes categorías de configuración
const serverSchema = joi.object({
  APP: joi.string(),
  PORT: joi.number(),
  HOST: joi.string(),
  CORS: joi.string().default('*'),
  NODE_ENV: joi.string().valid('dev', 'production', 'test').default('dev'),
  API_KEY: joi.string().required(),
});

const databaseSchema = joi.object({
  DB_USER: joi.string().required(),
  DB_PASSWORD: joi.string().required(),
  DB_SERVER: joi.string().required(),
  DB_DATABASE: joi.string().required(),
  DB_DATABASE2: joi.string().optional(),
  DB_POOL_MIN: joi.number().default(5),
  DB_POOL_MAX: joi.number().default(20),
  DB_POOL_IDLE_TIMEOUT: joi.number().default(30000),
  DB_POOL_ACQUIRE_TIMEOUT: joi.number().default(15000),
  DB_POOL_CREATE_TIMEOUT: joi.number().default(15000),
});

// const redisSchema = joi.object({
//   REDIS_HOST: joi.string().default('localhost'),
//   REDIS_PORT: joi.number().default(6379),
//   REDIS_DB: joi.number().default(0),
//   REDIS_PASSWORD: joi.string().allow('').default(''),
//   REDIS_PREFIX: joi.string().default('app:'),
//   REDIS_DISABLED: joi.boolean().default(false),
// });

const jwtSchema = joi.object({
  JWT_SECRET: joi.string().required(),
  JWT_REFRESH_SECRET: joi.string().required(),
  JWT_EXPIRATION_TIME: joi.string().default('4h'),
  JWT_REFRESH_EXPIRATION_TIME: joi.string().default('7d'),
});

const cookieSchema = joi.object({
  COOKIE_DOMAIN: joi.string().default('localhost'),
  COOKIE_SECURE: joi.boolean().default(false),
});

const rateLimitSchema = joi.object({
  THROTTLE_TTL: joi.number().default(60),
  THROTTLE_LIMIT: joi.number().default(10),
});

const bcryptSchema = joi.object({
  BCRYPT_SALT_ROUNDS: joi.number().default(12),
});

// Combina todos los esquemas
const envSchema = joi.object()
  .concat(serverSchema)
  .concat(databaseSchema)
  // .concat(redisSchema)
  .concat(jwtSchema)
  .concat(cookieSchema)
  .concat(rateLimitSchema)
  .concat(bcryptSchema)
  .unknown(true); // Permitir variables de entorno desconocidas

const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
});

if (error) {
  throw new Error(`Configuration validation error: ${error.message}`);
}

// Exportar objetos de configuración tipificados
export const serverConfig = {
  app: envVars.APP,
  port: envVars.PORT,
  host: envVars.HOST,
  cors: envVars.CORS,
  nodeEnv: envVars.NODE_ENV,
  apiKey: envVars.API_KEY,
};

export const dbConfig = {
  user: envVars.DB_USER,
  password: envVars.DB_PASSWORD,
  server: envVars.DB_SERVER,
  database: envVars.DB_DATABASE,
  database2: envVars.DB_DATABASE2,
  pool: {
    min: envVars.DB_POOL_MIN,
    max: envVars.DB_POOL_MAX,
    idleTimeout: envVars.DB_POOL_IDLE_TIMEOUT,
    acquireTimeout: envVars.DB_POOL_ACQUIRE_TIMEOUT,
    createTimeout: envVars.DB_POOL_CREATE_TIMEOUT,
  },
};

// export const redisConfig = {
//   host: envVars.REDIS_HOST,
//   port: envVars.REDIS_PORT,
//   db: envVars.REDIS_DB,
//   password: envVars.REDIS_PASSWORD,
//   prefix: envVars.REDIS_PREFIX,
//   disabled: envVars.REDIS_DISABLED,
// };

export const jwtConfig = {
  secret: envVars.JWT_SECRET,
  refreshSecret: envVars.JWT_REFRESH_SECRET,
  expirationTime: envVars.JWT_EXPIRATION_TIME,
  refreshExpirationTime: envVars.JWT_REFRESH_EXPIRATION_TIME,
};

export const cookieConfig = {
  domain: envVars.COOKIE_DOMAIN,
  secure: envVars.COOKIE_SECURE,
};

export const rateLimitConfig = {
  ttl: envVars.THROTTLE_TTL,
  limit: envVars.THROTTLE_LIMIT,
};

export const bcryptConfig = {
  saltRounds: envVars.BCRYPT_SALT_ROUNDS,
};

// Exportar todas las configuraciones en un solo objeto
export const env = {
  ...serverConfig,
  ...dbConfig,
  // ...redisConfig,
  ...jwtConfig,
  ...cookieConfig,
  ...rateLimitConfig,
  ...bcryptConfig,
};