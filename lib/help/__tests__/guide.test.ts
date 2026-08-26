import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RESULT_TAB_HELP,
  RESULT_TAB_IDS,
  resultTabContextId,
  WELCOME_SEEN_KEY,
} from "@/lib/help/guide";

describe("help guide", () => {
  it("defines help for every results tab", () => {
    for (const tabId of RESULT_TAB_IDS) {
      assert.ok(RESULT_TAB_HELP[tabId], `missing help for tab ${tabId}`);
      assert.ok(RESULT_TAB_HELP[tabId].title.length > 0);
    }
  });

  it("uses stable context ids per tab", () => {
    assert.equal(resultTabContextId("summary"), "tab.summary");
    assert.equal(resultTabContextId("chat"), "tab.chat");
  });

  it("uses v2 welcome storage key", () => {
    assert.match(WELCOME_SEEN_KEY, /help\.v2\.welcome/);
  });
});
