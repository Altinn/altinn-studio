import type { ReactElement } from 'react';
import type { Source } from '../../../../../types/ChatThread';
import { isUrlSafe } from '../../../../../utils/messageUtils';
import classes from './SourceList.module.css';

export type SourceListProps = {
  sources: Source[];
  label: string;
};

/**
 * Compact row of source chips under an assistant message. Each source is
 * a consulted knowledge source (docs page, skill, schema lookup) derived
 * from the agent's actual tool executions; sources with a safe URL link
 * to the original.
 */
export function SourceList({ sources, label }: SourceListProps): ReactElement {
  return (
    <div className={classes.sourceRow}>
      <span className={classes.sourceLabel}>{label}</span>
      {sources.map((source, index) => (
        <SourceChip key={`${source.title}-${index}`} source={source} />
      ))}
    </div>
  );
}

function SourceChip({ source }: { source: Source }): ReactElement {
  const safeUrl = source.url && isUrlSafe(source.url) ? source.url : null;

  if (safeUrl) {
    return (
      <a
        href={safeUrl}
        target='_blank'
        rel='noopener noreferrer'
        className={classes.sourceChip}
        title={safeUrl}
      >
        {source.title}
      </a>
    );
  }
  return <span className={classes.sourceChip}>{source.title}</span>;
}
