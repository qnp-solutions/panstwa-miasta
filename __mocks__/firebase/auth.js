// Minimal mock for firebase/auth used in unit tests.
// The authStore only imports the `User` type (erased by TypeScript at runtime).

module.exports = {
  getAuth: jest.fn(),
  connectAuthEmulator: jest.fn(),
  signInAnonymously: jest.fn(),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  OAuthProvider: jest.fn(),
};
