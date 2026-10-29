/**
 * The first major version of the app libraries that moves the process on the workflow engine. An
 * app on an earlier version moves its process itself, so the engine has nothing on it.
 */
export const WORKFLOW_ENGINE_FIRST_MAJOR_VERSION = 9;

/**
 * Whether an app on this version of the app libraries (`9.0.0.175`, `8.5.1`) runs its process on
 * the workflow engine. A missing or unreadable version counts as not: most apps in production are
 * on an earlier version, and the panel must never show them views of an engine that knows nothing
 * about them.
 */
export function usesWorkflowEngine(appLibVersion: string | undefined): boolean {
  const majorVersion = Number(appLibVersion?.split('.')[0]);
  return Number.isInteger(majorVersion) && majorVersion >= WORKFLOW_ENGINE_FIRST_MAJOR_VERSION;
}
