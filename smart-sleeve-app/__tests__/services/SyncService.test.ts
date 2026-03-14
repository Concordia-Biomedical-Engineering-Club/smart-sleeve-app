import { syncNow, uploadUnsyncedSessions, downloadSessionsForUser } from "../../services/SyncService";
import { fetchUnsyncedSessions, upsertSession, initDatabase } from "../../services/Database";
import { getDocs, setDoc } from "firebase/firestore";

// Mocking the external dependencies
jest.mock("../../services/Database", () => ({
  fetchUnsyncedSessions: jest.fn(),
  markSessionSynced: jest.fn(),
  upsertSession: jest.fn(),
  initDatabase: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock("../../firebaseConfig", () => ({
  db: {}, // Dummy object to satisfy the db check 
}));

jest.mock("../../store/store", () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

describe("SyncService", () => {
  const mockUid = "test_user_uid";
  const mockLegacyEmail = "test@example.com";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Re-entrancy Mutex Lock", () => {
    it("should prevent concurrent syncNow executions and exit early", async () => {
      // Setup a mock that delays resolution to simulate an in-flight sync
      let resolveFirstCall: any;
      const firstCallPromise = new Promise((resolve) => { resolveFirstCall = resolve });
      (initDatabase as jest.Mock).mockReturnValueOnce(firstCallPromise);

      // Trigger the first sync (it will hang on initDatabase)
      const execution1 = syncNow(mockUid);
      
      // Trigger the second sync immediately
      await syncNow(mockUid);

      // Resolve the first call to let it finish
      resolveFirstCall();
      await execution1;

      // initDatabase should only be called once because the second call was blocked by the mutex
      expect(initDatabase).toHaveBeenCalledTimes(1);
    });
  });

  describe("Safe UID Migration (Backfill)", () => {
    it("should attempt legacy email read if canonical UID path is empty", async () => {
      // Mock canonical UID fetch returning empty
      const emptySnapshot = { empty: true, docs: [], size: 0 };
      // Mock legacy Email fetch returning sessions
      const legacyDocs = [
        { data: () => ({ id: "session1", userId: mockLegacyEmail, timestamp: 100, updatedAt: 100 }) }
      ];
      const legacySnapshot = { empty: false, docs: legacyDocs, size: 1 };

      (getDocs as jest.Mock)
        .mockResolvedValueOnce(emptySnapshot) // 1st call: UID path
        .mockResolvedValueOnce(legacySnapshot); // 2nd call: Email path

      await downloadSessionsForUser(mockUid, mockLegacyEmail);

      // Ensure getDocs was called twice (UID, then Email)
      expect(getDocs).toHaveBeenCalledTimes(2);
      
      // Ensure the legacy session was upserted locally
      expect(upsertSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: "session1", userId: mockUid })
      );

      // Ensure it was mirrored (backfilled) to the new UID path
      expect(setDoc).toHaveBeenCalledWith(
        undefined, // Because we mocked doc() to return undefined for simplicity
        expect.objectContaining({ userId: mockUid }),
        { merge: true }
      );
    });
  });
});
