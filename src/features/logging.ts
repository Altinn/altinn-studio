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

function postLog(level: 'info' | 'warn' | 'error', args: any[], once = false) {
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

export function parseErrorArgs(args: any[]): string {
  return args
    .map((arg) => {
      if (isAxiosError(arg)) {
        return `Message: ${arg.message}\nRequest: ${arg.config?.method?.toUpperCase()} '${arg.config
          ?.url}'\nResponse: ${arg.response?.data}`;
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
      ((...args: any[]) => {
        postLog(levelLower, args, suffix === 'Once');
      });
  }
});

window.CypressLog = (...args: string[]) => {
  if (!window.Cypress) {
    return;
  }
  (window as any)._cyLog = (window as any)._cyLog || [];
  (window as any)._cyLog.push(args.join(' '));
};
window.CypressSaveLog = () => {
  (window as any)._cyLogSave = true;
};
