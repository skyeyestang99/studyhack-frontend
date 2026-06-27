const requiredEnvVars = {
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
} as const;

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  apiUrl: requiredEnvVars.NEXT_PUBLIC_API_URL!,
  appEnv: process.env.NEXT_PUBLIC_APP_ENV || "local",
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS === "true",
};
