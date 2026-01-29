/**
 * altinnStudioEnvironment is the facade object that should be used to access environment variables.
 */
export type AltinnStudioEnvironment = {
  aiConnectionString?: string;
  postHogApiKey?: string;
  postHogApiHost?: string;
};

/*
 * studioWindow is an extended window object that contains environment specific variables that is set in the index.cshtml file.
 * This should not be exported and used directly, but instead used trough the altinnStudioEnvironment object.
 */
const studioWindow: typeof window & AltinnStudioEnvironment = window;

// altinnStudioEnvironment is an object that contains environment specific variables that is set in the index.cshtml file.
export const altinnStudioEnvironment: AltinnStudioEnvironment = {
  aiConnectionString: studioWindow.aiConnectionString,
  postHogApiKey: studioWindow.postHogApiKey,
  postHogApiHost: studioWindow.postHogApiHost,
};
