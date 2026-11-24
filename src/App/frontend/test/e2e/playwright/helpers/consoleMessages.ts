import type { BrowserContext } from '@playwright/test';

import { ignoredConsoleMessages } from 'test/e2e/support/fail-on-console-log';

/** The console methods the Cypress suite fails on (see consoleTypes in test/e2e/support/index.ts) */
const failingConsoleTypes = ['error', 'warn', 'info', 'trace'] as const;

export type ConsoleMessage = { type: string; message: string; url: string };

const bindingName = '__playwrightReportConsoleMessage';

/**
 * Records what the app writes with console.error/warn/info/trace in the top window of every page in the context.
 *
 * Like cypress-fail-on-console-error, this wraps the console methods in the page instead of listening to Playwright's
 * 'console' event. The event also reports messages from the browser itself, such as failed resource loads, which the
 * Cypress suite never failed on. Arguments are turned into a string the same way, so that the ignore list in
 * test/e2e/support/fail-on-console-log.ts matches the same messages.
 */
export async function recordConsoleMessages(context: BrowserContext): Promise<ConsoleMessage[]> {
  const messages: ConsoleMessage[] = [];
  await context.exposeBinding(bindingName, ({ frame }, type: string, message: string) => {
    messages.push({ type, message, url: frame.url() });
  });
  await context.addInitScript(
    ({ types, binding }) => {
      if (window !== window.top) {
        return;
      }
      const callToString = (args: unknown[]) =>
        args
          .reduce<string>((previous, current) => {
            const value = (current as { stack?: unknown } | null | undefined)?.stack ?? current;
            let asString: string;
            try {
              asString = typeof value !== 'string' ? JSON.stringify(value) : value;
            } catch {
              asString = String(value);
            }
            return `${previous} ${asString}`;
          }, '')
          .trim();

      for (const type of types) {
        // This wraps the console methods; it does not write to the console itself
        // eslint-disable-next-line no-console
        const original = console[type];
        // eslint-disable-next-line no-console
        console[type] = (...args: unknown[]) => {
          const report = (window as unknown as Record<string, (type: string, message: string) => Promise<void>>)[
            binding
          ];
          report?.(type, callToString(args)).catch(() => undefined);
          return original.apply(console, args);
        };
      }
    },
    { types: failingConsoleTypes, binding: bindingName },
  );
  return messages;
}

export function unexpectedConsoleMessages(messages: ConsoleMessage[]): ConsoleMessage[] {
  return messages.filter(({ message }) => !ignoredConsoleMessages.some((ignored) => ignored.test(message)));
}
