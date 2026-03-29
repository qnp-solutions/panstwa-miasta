/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^firebase/app$': '<rootDir>/__mocks__/firebase/app.js',
    '^firebase/auth$': '<rootDir>/__mocks__/firebase/auth.js',
    '^firebase/firestore$': '<rootDir>/__mocks__/firebase/firestore.js',
    '^firebase/functions$': '<rootDir>/__mocks__/firebase/functions.js',
    '^firebase/database$': '<rootDir>/__mocks__/firebase/database.js',
  },
};
