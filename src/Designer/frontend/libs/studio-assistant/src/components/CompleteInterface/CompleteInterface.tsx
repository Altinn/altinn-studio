import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { StudioResizableLayout } from '@studio/components';
import { ToolColumn } from '../ToolColumn/ToolColumn';
import classes from './CompleteInterface.module.css';
import { HeadingBar } from '../HeadingBar/HeadingBar';
import { ThreadColumn } from '../ThreadColumn/ThreadColumn';
import { ThreadColumnCollapsed } from '../ThreadColumnCollapsed/ThreadColumnCollapsed';
import { ChatColumn } from '../ChatColumn/ChatColumn';
import { ToolColumnMode } from '../../types/ToolColumnMode';
import type { AssistantProps } from '../../Assistant/Assistant';

export type CompleteInterfaceProps = Omit<AssistantProps, 'enableCompactInterface'>;

/**
 * Full page version of the chat interface with thread history, preview and code viewer.
 */
export function CompleteInterface({
  texts,
  chatThreads = [],
  messages = [],
  onSubmitMessage,
  onCancelWorkflow,
  cancelledMessageContent,
  onCancelledMessageConsumed,
  activeThreadId,
  connectionStatus,
  workflowStatus,
  onSelectThread,
  onDeleteThread,
  onCreateThread,
  previewContent,
  fileBrowserContent,
  currentUser,
}: CompleteInterfaceProps): ReactElement {
  const [isThreadColumnCollapsed, setIsThreadColumnCollapsed] = useState(false);
  const [toolColumnMode, setToolColumnMode] = useState<ToolColumnMode>(ToolColumnMode.Preview);

  const currentThreadWorkflowStatus =
    workflowStatus?.sessionId === activeThreadId ? workflowStatus : undefined;

  const handleToggleCollapse = (): void => setIsThreadColumnCollapsed(!isThreadColumnCollapsed);

  const handleCreateThread = useCallback(() => {
    if (onCreateThread) {
      onCreateThread();
      setIsThreadColumnCollapsed(false);
    }
  }, [onCreateThread]);

  return (
    <div className={classes.container}>
      <HeadingBar
        texts={texts}
        selectedToolColumnMode={toolColumnMode}
        onModeChange={setToolColumnMode}
        connectionStatus={connectionStatus}
      />

      <StudioResizableLayout.Container orientation='horizontal' localStorageContext='ai-chat'>
        <StudioResizableLayout.Element
          minimumSize={200}
          maximumSize={350}
          collapsed={isThreadColumnCollapsed}
          collapsedSize={80}
        >
          {isThreadColumnCollapsed ? (
            <ThreadColumnCollapsed
              texts={texts}
              onToggleCollapse={handleToggleCollapse}
              onCreateThread={handleCreateThread}
            />
          ) : (
            <ThreadColumn
              texts={texts}
              chatThreads={chatThreads}
              selectedThreadId={activeThreadId || undefined}
              currentSessionId={activeThreadId}
              onSelectThread={onSelectThread}
              onDeleteThread={onDeleteThread}
              onCreateThread={handleCreateThread}
              onToggleCollapse={handleToggleCollapse}
            />
          )}
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element minimumSize={400}>
          <ChatColumn
            texts={texts}
            messages={messages}
            onSubmitMessage={onSubmitMessage}
            onCancelWorkflow={onCancelWorkflow}
            cancelledMessageContent={cancelledMessageContent}
            onCancelledMessageConsumed={onCancelledMessageConsumed}
            workflowStatus={currentThreadWorkflowStatus}
            enableCompactInterface={false}
            currentUser={currentUser}
          />
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element minimumSize={200}>
          <ToolColumn
            mode={toolColumnMode}
            previewContent={previewContent}
            fileBrowserContent={fileBrowserContent}
          />
        </StudioResizableLayout.Element>
      </StudioResizableLayout.Container>
    </div>
  );
}
