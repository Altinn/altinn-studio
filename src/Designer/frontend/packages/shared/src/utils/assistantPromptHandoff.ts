import { typedSessionStorage } from '@studio/pure-functions';

const storageKey = (org: string, app: string): string =>
  `studio:assistantPromptHandoff:${org}:${app}`;

export const storeAssistantPromptHandoff = (org: string, app: string, prompt: string): void => {
  typedSessionStorage.setItem(storageKey(org, app), prompt);
};

export const takeAssistantPromptHandoff = (org: string, app: string): string | null => {
  const key = storageKey(org, app);
  const prompt = typedSessionStorage.getItem<string>(key);
  if (prompt) typedSessionStorage.removeItem(key);
  return prompt ?? null;
};
