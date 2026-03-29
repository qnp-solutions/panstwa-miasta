// Minimal mock for firebase/firestore used in unit tests.
// Tests only use the Timestamp type (erased by TypeScript) — no actual Firebase
// calls are made, so we export lightweight stubs.

class Timestamp {
  constructor(seconds, nanoseconds) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }
  static fromDate(date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
  toDate() {
    return new Date(this.seconds * 1000);
  }
}

module.exports = {
  Timestamp,
  getFirestore: jest.fn(),
  connectFirestoreEmulator: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => new Timestamp(0, 0)),
};
