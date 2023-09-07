import { isAxiosError } from 'src/utils/network/sharedNetworking';
import type { IDevToolsLog } from 'src/features/devtools/data/types';

let logIndex = 0;
const logKeys = new Set<string>();
const tempLogs: IDevToolsLog[] = [];
let timer: ReturnType<typeof setTimeout>;

function pushLogs() {
  if (window.reduxStore) {
    window.reduxStore.dispatch({ type: 'devTools/postLogs', payload: { logs: tempLogs } });
    tempLogs.splice(0, tempLogs.length);
  }
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

window.logError = (...args: any[]) => {
  postLog('error', args);
};
window.logErrorOnce = (...args: any[]) => {
  postLog('error', args, true);
};

window.logWarn = (...args: any[]) => {
  postLog('warn', args);
};
window.logWarnOnce = (...args: any[]) => {
  postLog('warn', args, true);
};

window.logInfo = (...args: any[]) => {
  postLog('info', args);
};
window.logInfoOnce = (...args: any[]) => {
  postLog('info', args, true);
};
