import { AxiosError } from 'axios';

let index = -1;
function postLog(level: string, args: any[]) {
  if (window.reduxStore) {
    index++;
    const message = parseErrorArgs(args);
    window.reduxStore.dispatch({ type: 'devTools/postLog', payload: { index, level, message } });
  }
}

export function parseErrorArgs(args: any[]): string {
  return args
    .map((arg) => {
      if (arg instanceof AxiosError) {
        return `Request failed, check the server logs for more details. ${arg.config?.method?.toUpperCase()} '${arg
          .config?.url}': ${arg.message}`;
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

window.logWarn = (...args: any[]) => {
  postLog('warn', args);
};

window.logInfo = (...args: any[]) => {
  postLog('info', args);
};
