import React, { useState } from 'react';

import {
  DownloadIcon,
  ExclamationmarkTriangleFillIcon,
  InformationSquareFillIcon,
  TrashIcon,
  XMarkOctagonFillIcon,
} from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { Input } from 'src/app-components/Input/Input';
import classes from 'src/features/devtools/components/DevToolsLogs/DevToolsLogs.module.css';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';

const colorMap = {
  error: 'red',
  warn: 'darkorange',
  info: 'black',
};

export const DevToolsLogs = () => {
  const logs = useDevToolsStore((state) => state.logs);
  const [filter, setFilter] = useState('');
  const [showLevels, setShowLevels] = useState({ error: true, warn: true, info: true });

  const clearLogs = useDevToolsStore((state) => state.actions.logsClear);
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
          color='second'
          icon={true}
        >
          <TrashIcon
            fontSize='1rem'
            title='slett alle logger'
          />
        </Button>
        <Button
          onClick={saveLogs}
          color='second'
          icon={true}
        >
          <DownloadIcon
            fontSize='1rem'
            title='lagre logger til fil'
          />
        </Button>
        <div className={classes.filterField}>
          <Input
            aria-label='Filtrer logger'
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder='Filtrer logger'
          />
        </div>

        <Button
          onClick={() => toggleShow('error')}
          color='second'
          variant={showLevels.error ? 'primary' : 'secondary'}
          icon={true}
        >
          <XMarkOctagonFillIcon
            fontSize='1rem'
            title='vis/skjul error'
          />
        </Button>
        <Button
          onClick={() => toggleShow('warn')}
          color='second'
          variant={showLevels.warn ? 'primary' : 'secondary'}
          icon={true}
        >
          <ExclamationmarkTriangleFillIcon
            fontSize='1rem'
            title='vis/skjul advarsler'
          />
        </Button>
        <Button
          onClick={() => toggleShow('info')}
          color='second'
          variant={showLevels.info ? 'primary' : 'secondary'}
          icon={true}
        >
          <InformationSquareFillIcon
            fontSize='1rem'
            title='vis/skjul informasjon'
          />
        </Button>
      </div>
      <div className={classes.logContainer}>
        {filteredLogs.map((log) => (
          <div key={log.index}>
            <span>{log.index}.</span>
            <pre style={{ color: colorMap[log.level] }}>
              {log.message.split('\n').map((line) => {
                // Find URLs and make them clickable as links
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const split = line.split(urlRegex);
                return (
                  <React.Fragment key={line}>
                    {split.map((part, index) => {
                      if (part.match(urlRegex)) {
                        return (
                          <a
                            key={index}
                            href={part}
                            target='_blank'
                            rel='noreferrer'
                          >
                            {part}
                          </a>
                        );
                      }
                      return part;
                    })}
                    <br />
                  </React.Fragment>
                );
              })}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};
