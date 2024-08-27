import { isAxiosError } from 'axios';

import { DevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import type { IDevToolsLog } from 'src/features/devtools/data/types';

let logIndex = 0;
const logKeys = new Set<string>();
const tempLogs: IDevToolsLog[] = [];
let timer: ReturnType<typeof setTimeout>;

function pushLogs() {
  DevToolsStore.getState().actions.postLogs(tempLogs);
  tempLogs.splice(0, tempLogs.length);
}

function postLog(level: 'info' | 'warn' | 'error', args: unknown[], once = false) {
  const message = parseErrorArgs(args);

  if (once) {
    const key = `${level}:${message}`;
    if (logKeys.has(key)) {
      return;
    }
    logKeys.add(key);
  }

  logIndex += 1;
  tempLogs.push({ index: logIndex, level, message });
  clearTimeout(timer);
  if (tempLogs.length > 100) {
    pushLogs();
  } else {
    timer = setTimeout(pushLogs, 400);
  }
}

export function parseErrorArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (isAxiosError(arg)) {
        const message = arg.message;
        const method = arg.config?.method?.toUpperCase();
        const url = arg.config?.url;
        const data = arg.response?.data;
        const stringData = typeof data === 'object' ? JSON.stringify(data) : String(data);
        return `Message: ${message}\nRequest: ${method ?? '<method not found>'} '${
          url ?? '<url not found>'
        }'\nResponse: ${stringData}`;
      }
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}`;
      }
      if (typeof arg === 'object') {
        return JSON.stringify(arg);
      }
      return String(arg);
    })
    .reduce((message, part) => {
      if (message.length === 0) {
        return part;
      }
      if (part.length === 0) {
        return message;
      }
      if (message.endsWith('\n')) {
        return `${message}${part}`;
      }
      return `${message} ${part}`;
    }, '');
}

['Error', 'Warn', 'Info'].forEach((level) => {
  const levelLower = level.toLowerCase() as 'error' | 'warn' | 'info';
  for (const suffix of ['', 'Once'] as const) {
    window[`log${level}${suffix}`] =
      window[`log${level}${suffix}`] ??
      ((...args: unknown[]) => {
        postLog(levelLower, args, suffix === 'Once');
      });
  }
});

window.CypressLog = (...args: string[]) => {
  if (!window.Cypress) {
    return;
  }
  const dateStamp = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._cyLog = (window as any)._cyLog || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._cyLog.push(`${dateStamp}: ${args.join(' ')}`);
};
window.CypressSaveLog = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._cyLogSave = true;
};
