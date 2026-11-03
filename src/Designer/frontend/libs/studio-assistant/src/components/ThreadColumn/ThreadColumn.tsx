import { useCallback, useId, useRef } from 'react';
import type { ReactElement } from 'react';
import { StudioButton, StudioHeading } from '@studio/components';
import classes from './ThreadColumn.module.css';
import { PlusIcon, SidebarLeftIcon } from '@studio/icons';
import { AboutAssistantDialog } from './AboutAssistantDialog';
import { ThreadSelector } from './ThreadSelector';
import type { ChatThread } from '../../types/ChatThread';
import type { AssistantTexts } from '../../types/AssistantTexts';
import type { WorkflowStatus } from '../../types/WorkflowStatus';

export type ThreadColumnProps = {
  texts: AssistantTexts;
  chatThreads: ChatThread[];
  selectedThreadId?: string;
  workflowStatusByThread?: Record<string, WorkflowStatus>;
  onToggleCollapse?: () => void;
  onSelectThread?: (threadId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onCreateThread?: () => void;
};

export function ThreadColumn({
  texts,
  chatThreads,
  selectedThreadId,
  workflowStatusByThread,
  onToggleCollapse,
  onSelectThread = (): void => {},
  onDeleteThread,
  onCreateThread,
}: ThreadColumnProps): ReactElement {
  const headingId = useId();
  const newThreadButtonRef = useRef<HTMLButtonElement>(null);
  const focusNewThreadButton = useCallback(() => newThreadButtonRef.current?.focus(), []);

  return (
    <div className={classes.threadColumn}>
      <div className={classes.threadButtons}>
        <StudioButton variant='secondary' onClick={onToggleCollapse} fullWidth>
          <SidebarLeftIcon />
          {texts.hideThreads}
        </StudioButton>
        <StudioButton ref={newThreadButtonRef} onClick={onCreateThread} fullWidth>
          <PlusIcon />
          {texts.newThread}
        </StudioButton>
      </div>
      <StudioHeading id={headingId} level={3} className={classes.threadHeading}>
        {texts.previousThreads}
      </StudioHeading>
      <div className={classes.threadList}>
        <ThreadSelector
          texts={texts.threadSelector}
          chatThreads={chatThreads}
          selectedThreadId={selectedThreadId}
          workflowStatusByThread={workflowStatusByThread}
          headingId={headingId}
          onSelectThread={onSelectThread}
          onDeleteThread={onDeleteThread}
          onLastThreadDeleted={focusNewThreadButton}
        />
      </div>
      <div className={classes.aboutSection}>
        <AboutAssistantDialog texts={texts.aboutAssistantDialog} />
      </div>
    </div>
  );
}
