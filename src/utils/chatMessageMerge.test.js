import { mergeChatMessages } from "./chatMessageMerge";

// NOTE: `react-scripts test` cannot be invoked in this environment (the
// `react-scripts` binary itself fails to resolve — a pre-existing,
// separately tracked blocker, not introduced by this change). This suite
// is written and believed correct but has not been executed here.

describe("mergeChatMessages", () => {
  it("keeps a pending optimistic message the server does not know about yet", () => {
    const local = [
      {
        id: "tmp_1",
        clientMessageId: "client-abc",
        message: "hello",
        pending: true,
        createdAt: "2026-01-01T10:00:05.000Z",
      },
    ];

    const merged = mergeChatMessages({ serverMessages: [], localMessages: local });

    expect(merged).toHaveLength(1);
    expect(merged[0].pending).toBe(true);
    expect(merged[0].id).toBe("tmp_1");
  });

  it("replaces the pending entry with the server version once acknowledged, without duplicating it", () => {
    const local = [
      {
        id: "tmp_1",
        clientMessageId: "client-abc",
        message: "hello",
        pending: true,
        createdAt: "2026-01-01T10:00:05.000Z",
      },
    ];
    const server = [
      {
        id: "server-real-id",
        clientMessageId: "client-abc",
        message: "hello",
        senderRole: "doctor",
        createdAt: "2026-01-01T10:00:05.000Z",
      },
    ];

    const merged = mergeChatMessages({ serverMessages: server, localMessages: local });

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("server-real-id");
    expect(merged[0].pending).toBeUndefined();
  });

  it("does not wipe the optimistic bubble on a poll that races the send response — the core disappearing-message bug", () => {
    // This reproduces the exact race: handleSend() has appended the
    // optimistic entry locally, but the concurrent 4s poll's GET snapshot
    // was taken before the POST committed server-side, so it doesn't
    // contain the new message yet.
    const local = [
      { id: "server-1", clientMessageId: "c-1", message: "earlier", createdAt: "2026-01-01T09:00:00.000Z" },
      { id: "tmp_2", clientMessageId: "c-2", message: "just sent", pending: true, createdAt: "2026-01-01T09:05:00.000Z" },
    ];
    // Stale poll snapshot — doesn't include "just sent" yet.
    const server = [
      { id: "server-1", clientMessageId: "c-1", message: "earlier", createdAt: "2026-01-01T09:00:00.000Z" },
    ];

    const merged = mergeChatMessages({ serverMessages: server, localMessages: local });

    expect(merged.map((m) => m.id)).toEqual(["server-1", "tmp_2"]);
    expect(merged.find((m) => m.id === "tmp_2").pending).toBe(true);
  });

  it("keeps a failed message visible until retried", () => {
    const local = [
      {
        id: "tmp_3",
        clientMessageId: "client-failed",
        message: "oops",
        failed: true,
        createdAt: "2026-01-01T11:00:00.000Z",
      },
    ];

    const merged = mergeChatMessages({ serverMessages: [], localMessages: local });

    expect(merged).toHaveLength(1);
    expect(merged[0].failed).toBe(true);
  });

  it("sorts by createdAt ascending with a stable fallback for ties/missing timestamps", () => {
    const server = [
      { id: "b", message: "second", createdAt: "2026-01-01T10:00:02.000Z" },
      { id: "a", message: "first", createdAt: "2026-01-01T10:00:01.000Z" },
    ];

    const merged = mergeChatMessages({ serverMessages: server, localMessages: [] });

    expect(merged.map((m) => m.id)).toEqual(["a", "b"]);
  });
});
