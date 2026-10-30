import test from "node:test";
import assert from "node:assert/strict";
import { logNswFailure } from "../lib/nsw-worker.js";

test("diagnostic logging includes only whitelisted stages and HTTP status", () => {
  const original = console.error;
  const events = [];
  console.error = (...args) => events.push(args);
  try {
    logNswFailure("oauth_rejected", 401);
    logNswFailure("credentials_missing");
    logNswFailure("arbitrary_user_input", 200);
    logNswFailure("browse_rejected", 999);
  } finally {
    console.error = original;
  }
  assert.deepEqual(events, [
    ["agentcheck_nsw_failure", { stage: "oauth_rejected", upstreamStatus: 401 }],
    ["agentcheck_nsw_failure", { stage: "credentials_missing" }],
    ["agentcheck_nsw_failure", { stage: "browse_rejected" }],
  ]);
});
