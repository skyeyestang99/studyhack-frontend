const requiredEnvVars = {
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
} as const;

export type MockScenario =
  | "default"
  | "empty-courses"
  | "loading"
  | "error";

const mockScenarios = new Set<MockScenario>([
  "default",
  "empty-courses",
  "loading",
  "error",
]);

function parseMockScenario(value: string | undefined): MockScenario {
  return mockScenarios.has(value as MockScenario)
    ? (value as MockScenario)
    : "default";
}

function parseMockDelay(value: string | undefined, scenario: MockScenario) {
  if (value !== undefined) {
    const delay = Number(value);
    if (Number.isFinite(delay) && delay >= 0) return delay;
  }
  return scenario === "loading" ? 1_500 : 0;
}

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const mockScenario = parseMockScenario(
  process.env.NEXT_PUBLIC_MOCK_SCENARIO,
);

export const env = {
  apiUrl: requiredEnvVars.NEXT_PUBLIC_API_URL!,
  appEnv: process.env.NEXT_PUBLIC_APP_ENV || "local",
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS === "true",
  mockScenario,
  mockDelayMs: parseMockDelay(
    process.env.NEXT_PUBLIC_MOCK_DELAY_MS,
    mockScenario,
  ),
};
