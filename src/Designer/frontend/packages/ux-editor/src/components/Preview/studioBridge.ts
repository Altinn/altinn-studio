/**
 * The errors the app frontend found in each component, by the component's ID, as the Studio bridge in preview's page
 * sends them. The preview service's README describes the bridge and its messages.
 */
export type PreviewComponentErrors = ReadonlyMap<string, readonly string[]>;

export const noPreviewComponentErrors: PreviewComponentErrors = new Map();

export type StudioBridgeMessage =
  { type: 'ready' } | { type: 'componentErrors'; errors: PreviewComponentErrors };

const SOURCE = 'altinn-studio-preview';
const VERSION = 1;
const MAX_COMPONENTS = 200;
const MAX_ERRORS = 20;
const MAX_LENGTH = 1000;

/**
 * The message, or `null` when it isn't one from the bridge. The app's own scripts run in preview's page too and can
 * send anything, so the message is checked as untrusted input, and the editors only show what it says.
 */
export const parseStudioBridgeMessage = (data: unknown): StudioBridgeMessage | null => {
  if (!isRecord(data) || data.source !== SOURCE || data.version !== VERSION) return null;
  switch (data.type) {
    case 'ready':
      return { type: 'ready' };
    case 'componentErrors':
      return isRecord(data.errors)
        ? { type: 'componentErrors', errors: parseComponentErrors(data.errors) }
        : null;
    default:
      return null;
  }
};

const parseComponentErrors = (errors: Record<string, unknown>): PreviewComponentErrors =>
  new Map(
    Object.entries(errors)
      .slice(0, MAX_COMPONENTS)
      .map(([componentId, messages]): [string, string[]] => [
        componentId,
        Array.isArray(messages)
          ? messages
              .filter((message): message is string => typeof message === 'string')
              .slice(0, MAX_ERRORS)
              .map((message) => message.slice(0, MAX_LENGTH))
          : [],
      ])
      .filter(([, messages]) => messages.length > 0),
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
