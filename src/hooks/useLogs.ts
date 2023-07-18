import { useRef } from 'react';
import { useDispatch } from 'react-redux';

import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { parseErrorArgs } from 'src/features/logging';

/**
 * This can safely be used inside the render function of a component without spamming the logs
 * on every rerender; as long as the message is not changed each time it is called.
 */
export const useLogs = () => {
  const logged = useRef(new Set<string>());
  const dispatch = useDispatch();

  function logOnce(level: 'info' | 'warn' | 'error', args: any[]) {
    const message = parseErrorArgs(args);
    const logKey = `${level}-${message}`;
    if (!logged.current.has(logKey)) {
      logged.current.add(logKey);
      dispatch(DevToolsActions.postLog({ level, message }));
    }
  }

  const logInfo = (...args: any[]) => logOnce('info', args);
  const logWarn = (...args: any) => logOnce('warn', args);
  const logError = (...args: any[]) => logOnce('error', args);

  return { logInfo, logWarn, logError };
};
