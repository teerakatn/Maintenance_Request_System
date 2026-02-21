/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/__tests__"],
  setupFiles: ["<rootDir>/src/__tests__/setup.ts"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/__tests__/**",
    "!src/server.ts",
    "!src/lib/prisma.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  // ซ่อน console log ขณะรัน test (เปิดด้วย --verbose หากต้องการ)
  silent: false,
};
