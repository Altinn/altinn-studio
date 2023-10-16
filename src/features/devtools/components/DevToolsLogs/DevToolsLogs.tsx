import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { Button, Textfield } from '@digdir/design-system-react';
import {
  DownloadIcon,
  ExclamationmarkTriangleFillIcon,
  InformationSquareFillIcon,
  TrashIcon,
  XMarkOctagonFillIcon,
} from '@navikt/aksel-icons';

import classes from 'src/features/devtools/components/DevToolsLogs/DevToolsLogs.module.css';
import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';

const colorMap = {
  error: 'red',
  warn: 'darkorange',
  info: 'black',
};

export const DevToolsLogs = () => {
  const logs = useAppSelector((state) => state.devTools.logs);
  const [filter, setFilter] = useState('');
  const [showLevels, setShowLevels] = useState({ error: true, warn: true, info: true });

  const dispatch = useDispatch();
  const clearLogs = () => dispatch(DevToolsActions.logsClear());
  const toggleShow = (level: string) => setShowLevels({ ...showLevels, [level]: !showLevels[level] });
  const saveLogs = () => {
    const data = logs.map((log) => `${log.index}. - ${log.level.toUpperCase()}: ${log.message}`).join('\n\n');
    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${window.org}-${window.app}-${new Date().toISOString()}-logs.txt`);
    a.click();
  };

  const filteredLogs = logs.filter((log) => {
    if (!showLevels[log.level]) {
      return false;
    }
    if (filter === '') {
      return true;
    }
    return log.message.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className={classes.container}>
      <div className={classes.toolbar}>
        <Button
          onClick={clearLogs}
          color={'second'}
          size='small'
          icon={<TrashIcon title='slett alle logger' />}
        />
        <Button
          onClick={saveLogs}
          color={'second'}
          size='small'
          icon={<DownloadIcon title='lagre logger til fil' />}
        />
        <div className={classes.filterField}>
          <Textfield
            size='small'
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder='Filtrer logger'
          />
        </div>

        <Button
          onClick={() => toggleShow('error')}
          size='small'
          color={showLevels.error ? 'second' : 'inverted'}
          icon={<XMarkOctagonFillIcon title='vis/skjul error' />}
        />
        <Button
          onClick={() => toggleShow('warn')}
          size='small'
          color={showLevels.warn ? 'second' : 'inverted'}
          icon={<ExclamationmarkTriangleFillIcon title='vis/skjul advarsler' />}
        />
        <Button
          onClick={() => toggleShow('info')}
          size='small'
          color={showLevels.info ? 'second' : 'inverted'}
          icon={<InformationSquareFillIcon title='vis/skjul informasjon' />}
        />
      </div>
      <div className={classes.logContainer}>
        {filteredLogs.map((log) => (
          <div key={log.index}>
            <span>{log.index}.</span>
            <pre style={{ color: colorMap[log.level] }}>
              {log.message.split('\n').map((line) => (
                <>
                  {line}
                  <br />
                </>
              ))}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};
