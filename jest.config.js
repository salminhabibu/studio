module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest', // Use ts-jest preset for TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest', // Use babel-jest for JavaScript files if any
  },
  moduleNameMapper: {
    // Handle module aliases (if you have them in tsconfig.json)
    // Example: '^@/components/(.*)$': '<rootDir>/components/$1'
    '^@/ai/flows/smart-error-messages$': '<rootDir>/src/ai/flows/smart-error-messages',
    '^@/lib/aria2Client$': '<rootDir>/src/lib/aria2Client',
    // Add other aliases here if your project uses them
  },
  setupFilesAfterEnv: [
    // '<rootDir>/jest.setup.js' // if you have a setup file
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/mocks/', // Folder for manual mocks if used
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageReporters: ["json", "lcov", "text", "clover"],
  coverageDirectory: "coverage",
};
