import assert from "node:assert/strict";
import test from "node:test";

import { resolveReleaseTrigger } from "./resolve-release-trigger.mjs";

const appPullRequest = {
  number: 123,
  merged_at: "2026-08-05T10:00:00Z",
  base: { ref: "main" },
  head: { repo: { full_name: "contributor/altinn-studio" } },
  labels: [{ name: "release/app" }],
  changedFiles: ["src/App/backend/CHANGELOG.md"],
};

const studioctlPullRequest = {
  number: 456,
  merged_at: "2026-08-05T10:00:00Z",
  base: { ref: "release/studioctl/v1.2" },
  labels: [{ name: "release/studioctl" }],
  changedFiles: ["src/cli/CHANGELOG.md"],
};

function resolvePush(overrides = {}) {
  return resolveReleaseTrigger({
    eventName: "push",
    refName: "main",
    refType: "branch",
    sha: "0123456789abcdef",
    pullRequests: [appPullRequest],
    ...overrides,
  });
}

test("push: resolves an app release from a merged fork PR label", () => {
  assert.deepEqual(resolvePush(), {
    component: "app",
    baseBranch: "main",
    mergeSha: "0123456789abcdef",
    pullRequestNumber: "123",
  });
});

test("push: resolves a studioctl release on its canonical release branch", () => {
  assert.deepEqual(
    resolvePush({
      refName: "release/studioctl/v1.2",
      pullRequests: [studioctlPullRequest],
    }),
    {
      component: "studioctl",
      baseBranch: "release/studioctl/v1.2",
      mergeSha: "0123456789abcdef",
      pullRequestNumber: "456",
    }
  );
});

test("push: does not release for a merged PR without a release label", () => {
  assert.deepEqual(
    resolvePush({
      pullRequests: [{ ...appPullRequest, labels: [{ name: "area/app" }] }],
    }),
    {
      component: "",
      baseBranch: "main",
      mergeSha: "0123456789abcdef",
      pullRequestNumber: "",
    }
  );
});

test("push: ignores associated PRs that are unmerged or target another branch", () => {
  assert.deepEqual(
    resolvePush({
      pullRequests: [
        { ...appPullRequest, merged_at: null },
        { ...appPullRequest, base: { ref: "release/app/v1.0" } },
      ],
    }),
    {
      component: "",
      baseBranch: "main",
      mergeSha: "0123456789abcdef",
      pullRequestNumber: "",
    }
  );
});

test("push: rejects a PR with both component release labels", () => {
  assert.throws(
    () =>
      resolvePush({
        pullRequests: [
          {
            ...appPullRequest,
            labels: [{ name: "release/app" }, { name: "release/studioctl" }],
          },
        ],
      }),
    /exactly one release label/
  );
});

test("push: rejects multiple release-labelled PRs associated with the commit", () => {
  assert.throws(
    () =>
      resolvePush({
        pullRequests: [appPullRequest, { ...appPullRequest, number: 124 }],
      }),
    /multiple release pull requests/
  );
});

test("push: rejects a component label on another component's release branch", () => {
  assert.throws(
    () =>
      resolvePush({
        refName: "release/studioctl/v1.2",
        pullRequests: [
          {
            ...appPullRequest,
            base: { ref: "release/studioctl/v1.2" },
          },
        ],
      }),
    /cannot release app from branch/
  );
});

test("push: rejects a release label that does not match the changed changelog", () => {
  assert.throws(
    () =>
      resolvePush({
        pullRequests: [
          {
            ...appPullRequest,
            labels: [{ name: "release/studioctl" }],
          },
        ],
      }),
    /does not change src\/cli\/CHANGELOG.md/
  );
});

test("push: rejects a release PR that changes both component changelogs", () => {
  assert.throws(
    () =>
      resolvePush({
        pullRequests: [
          {
            ...appPullRequest,
            changedFiles: ["src/App/backend/CHANGELOG.md", "src/cli/CHANGELOG.md"],
          },
        ],
      }),
    /also changes the studioctl changelog/
  );
});

test("workflow dispatch: resolves the selected component from main", () => {
  assert.deepEqual(
    resolveReleaseTrigger({
      eventName: "workflow_dispatch",
      refName: "main",
      refType: "branch",
      sha: "fedcba9876543210",
      selectedComponent: "studioctl",
    }),
    {
      component: "studioctl",
      baseBranch: "main",
      mergeSha: "fedcba9876543210",
      pullRequestNumber: "",
    }
  );
});

test("workflow dispatch: resolves the selected component from its release branch", () => {
  assert.equal(
    resolveReleaseTrigger({
      eventName: "workflow_dispatch",
      refName: "release/app/v8.9",
      refType: "branch",
      sha: "fedcba9876543210",
      selectedComponent: "app",
    }).component,
    "app"
  );
});

test("workflow dispatch: rejects tags and mismatched release branches", () => {
  assert.throws(
    () =>
      resolveReleaseTrigger({
        eventName: "workflow_dispatch",
        refName: "app/v8.9.0",
        refType: "tag",
        sha: "fedcba9876543210",
        selectedComponent: "app",
      }),
    /must run from a branch/
  );

  assert.throws(
    () =>
      resolveReleaseTrigger({
        eventName: "workflow_dispatch",
        refName: "release/studioctl/v1.2",
        refType: "branch",
        sha: "fedcba9876543210",
        selectedComponent: "app",
      }),
    /cannot release app from branch/
  );
});
