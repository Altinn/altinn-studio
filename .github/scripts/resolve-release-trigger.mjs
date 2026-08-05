const CHANGELOG_BY_COMPONENT = {
  app: "src/App/backend/CHANGELOG.md",
  studioctl: "src/cli/CHANGELOG.md",
};
const COMPONENTS = new Set(Object.keys(CHANGELOG_BY_COMPONENT));

/**
 * Resolve whether a trusted canonical-branch event should run a component release.
 *
 * @param {{
 *   eventName: string,
 *   refName: string,
 *   refType: string,
 *   sha: string,
 *   selectedComponent?: string,
 *   pullRequests?: Array<{
 *     number: number,
 *     merged_at: string|null,
 *     base: {ref: string},
 *     labels: Array<{name?: string}>,
 *     changedFiles: string[]
 *   }>
 * }} input
 * @returns {{component: string, baseBranch: string, mergeSha: string, pullRequestNumber: string}}
 */
export function resolveReleaseTrigger(input) {
  validateCommonInput(input);

  if (input.eventName === "workflow_dispatch") {
    return resolveManualDispatch(input);
  }
  if (input.eventName === "push") {
    return resolvePush(input);
  }

  throw new Error(`unsupported release event '${input.eventName}'.`);
}

function validateCommonInput(input) {
  if (typeof input.refName !== "string" || input.refName.length === 0) {
    throw new Error("release ref name is required.");
  }
  if (typeof input.sha !== "string" || input.sha.length === 0) {
    throw new Error("release commit SHA is required.");
  }
}

function resolveManualDispatch(input) {
  if (input.refType !== "branch") {
    throw new Error("a manual release must run from a branch.");
  }

  const component = input.selectedComponent ?? "";
  validateComponent(component);
  validateReleaseBranch(component, input.refName);

  return result(component, input.refName, input.sha);
}

function resolvePush(input) {
  if (input.refType !== "branch") {
    throw new Error("a push release must run from a branch.");
  }

  const pullRequests = input.pullRequests ?? [];
  const releasePullRequests = pullRequests
    .filter((pullRequest) => pullRequest.merged_at && pullRequest.base.ref === input.refName)
    .map((pullRequest) => ({
      pullRequest,
      components: releaseComponents(pullRequest.labels),
    }))
    .filter(({ components }) => components.length > 0);

  if (releasePullRequests.length === 0) {
    return result("", input.refName, input.sha);
  }
  if (releasePullRequests.length > 1) {
    const numbers = releasePullRequests.map(({ pullRequest }) => `#${pullRequest.number}`).join(", ");
    throw new Error(`multiple release pull requests are associated with this commit: ${numbers}.`);
  }

  const [{ pullRequest, components }] = releasePullRequests;
  if (components.length !== 1) {
    throw new Error(`release pull request #${pullRequest.number} must have exactly one release label.`);
  }

  const [component] = components;
  validateReleaseBranch(component, input.refName);
  validateChangedChangelog(component, pullRequest.changedFiles ?? [], pullRequest.number);
  return result(component, input.refName, input.sha, pullRequest.number);
}

function releaseComponents(labels) {
  return labels
    .map(({ name }) => name)
    .filter((name) => typeof name === "string" && name.startsWith("release/"))
    .map((name) => name.slice("release/".length))
    .filter((component) => COMPONENTS.has(component));
}

function validateComponent(component) {
  if (!COMPONENTS.has(component)) {
    throw new Error(`unsupported release component '${component}'.`);
  }
}

function validateReleaseBranch(component, branch) {
  validateComponent(component);
  const releaseBranch = new RegExp(`^release/${component}/v[0-9]+\\.[0-9]+$`);
  if (branch !== "main" && !releaseBranch.test(branch)) {
    throw new Error(`cannot release ${component} from branch '${branch}'.`);
  }
}

function validateChangedChangelog(component, changedFiles, pullRequestNumber) {
  const expectedChangelog = CHANGELOG_BY_COMPONENT[component];
  if (!changedFiles.includes(expectedChangelog)) {
    throw new Error(`release pull request #${pullRequestNumber} does not change ${expectedChangelog}.`);
  }

  for (const [otherComponent, changelog] of Object.entries(CHANGELOG_BY_COMPONENT)) {
    if (otherComponent !== component && changedFiles.includes(changelog)) {
      throw new Error(
        `release pull request #${pullRequestNumber} also changes the ${otherComponent} changelog.`
      );
    }
  }
}

function result(component, baseBranch, mergeSha, pullRequestNumber = "") {
  return {
    component,
    baseBranch,
    mergeSha,
    pullRequestNumber: String(pullRequestNumber),
  };
}
