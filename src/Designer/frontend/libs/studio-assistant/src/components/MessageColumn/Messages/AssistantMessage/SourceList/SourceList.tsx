import type { ReactElement } from 'react';
import type { Source } from '../../../../../types/ChatThread';
import { formatFileSize, isUrlSafe } from '../../../../../utils/messageUtils';
import classes from './SourceList.module.css';

export type SourceListProps = {
  sources: Source[];
};

export function SourceList({ sources }: SourceListProps): ReactElement {
  const citedSources = sources.filter((source) => source.cited);
  const otherSources = sources.filter((source) => !source.cited);

  return (
    <div className={classes.sourcesSection}>
      {citedSources.length > 0 && (
        <>
          <div className={classes.sourcesSectionHeader}>
            <span className={classes.sourcesSectionTitle}>📚 Kilder brukt</span>
            <span className={classes.sourcesSectionCount}>{citedSources.length}</span>
          </div>
          <div className={classes.sourcesList}>
            {citedSources.map((source, index) => (
              <SourceItem key={`${source.tool}-${index}`} source={source} isCited={true} />
            ))}
          </div>
        </>
      )}

      {otherSources.length > 0 && (
        <>
          <div
            className={`${classes.sourcesSectionHeader} ${classes.sourcesSectionHeaderSecondary}`}
          >
            <span className={classes.sourcesSectionTitleSecondary}>📖 Tilgjengelige kilder</span>
            <span className={classes.sourcesSectionCount}>{otherSources.length}</span>
          </div>
          <div className={classes.sourcesList}>
            {otherSources.map((source, index) => (
              <SourceItem key={`${source.tool}-${index}`} source={source} isCited={false} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type SourceItemProps = {
  source: Source;
  isCited: boolean;
};

function SourceItem({ source, isCited }: SourceItemProps): ReactElement {
  const safeUrl = source.url && isUrlSafe(source.url) ? source.url : null;

  return (
    <div className={`${classes.sourceItem} ${!isCited ? classes.sourceItemSecondary : ''}`}>
      <div className={classes.sourceHeader}>
        {safeUrl ? (
          <a
            href={safeUrl}
            target='_blank'
            rel='noopener noreferrer'
            className={classes.sourceTitle}
          >
            {isCited ? '✅' : '🔗'} {source.title}
          </a>
        ) : (
          <span className={classes.sourceTitle}>
            {isCited ? '✅' : '📄'} {source.title}
          </span>
        )}
        <div className={classes.sourceMetadata}>
          {source.relevance !== undefined && (
            <span className={classes.sourceRelevance}>{Math.round(source.relevance * 100)}%</span>
          )}
          {source.contentLength && (
            <span className={classes.sourceSize}>{formatFileSize(source.contentLength)}</span>
          )}
        </div>
      </div>
      {source.matchedTerms && (
        <div className={classes.sourceMatched}>Matched: {source.matchedTerms}</div>
      )}
      {source.previewText && <div className={classes.sourcePreview}>{source.previewText}</div>}
    </div>
  );
}
