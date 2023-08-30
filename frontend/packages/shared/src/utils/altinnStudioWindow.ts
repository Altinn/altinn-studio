type AltinnStudioWindow = typeof window & {
  instrumentationKey?: string;
};
export const altinnStudioWindow: AltinnStudioWindow = window;
