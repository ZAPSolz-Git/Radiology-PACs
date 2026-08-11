import joi from 'joi';

const envSchema = joi.object({
  PORT: joi.number().default(5000),
  MONGO_URI: joi.string().required(),
  JWT_SECRET: joi.string().required().min(32),
  NODE_ENV: joi.string().valid('development', 'production').default('development'),
  FRONTEND_URL: joi.string().uri().default('http://localhost:3000'),
}).unknown();

const { value, error } = envSchema.validate(process.env);

if (error) {
  console.error('Environment validation error:', error.message);
  process.exit(1);
}

export default value;
