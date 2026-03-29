// Minimal mock for firebase/app used in unit tests.

module.exports = {
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
};
