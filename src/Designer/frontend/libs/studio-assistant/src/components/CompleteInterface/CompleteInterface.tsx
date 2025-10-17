import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioResizableLayout } from '@studio/components-legacy';
import { ToolColumn } from '../ToolColumn/ToolColumn';
import classes from './CompleteInterface.module.css';
import { HeadingBar } from '../HeadingBar/HeadingBar';
import type { ChatThread } from '../../types/ChatThread';
import { ThreadColumn } from '../ThreadColumn/ThreadColumn';
import { ThreadColumnCollapsed } from '../ThreadColumnCollapsed/ThreadColumnCollapsed';
import { ChatColumn } from '../ChatColumn/ChatColumn';
import { ToolColumnMode } from '../../types/ToolColumnMode';
import type { AssistantProps } from '../../Assistant/Assistant';
import type { ConnectionStatus } from '../../types/ConnectionStatus';

export type CompleteInterfaceProps = Omit<AssistantProps, 'enableCompactInterface'> & {
  activeThreadId?: string;
  connectionStatus?: ConnectionStatus;
  onSelectThread?: (threadId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onCreateThread?: () => void;
};

/**
 * Full page version of the chat interface with thread history, preview and code viewer.
 */
export function CompleteInterface({
  texts,
  chatThreads,
  onSubmitMessage,
  activeThreadId,
  connectionStatus,
  onSelectThread,
  onDeleteThread,
  onCreateThread,
}: CompleteInterfaceProps): ReactElement {
  const [isThreadColumnCollapsed, setIsThreadColumnCollapsed] = useState(false);
  const [toolColumnMode, setToolColumnMode] = useState<ToolColumnMode>(ToolColumnMode.Preview);

  // Get the current thread - prefer activeThreadId, then most recently updated thread
  const currentThread = React.useMemo(() => {
    // First try to find the explicitly requested thread
    if (activeThreadId) {
      const thread = chatThreads.find((t) => t.id === activeThreadId);
      if (thread) {
        return thread;
      }
    }

    // If no active thread is selected, return empty chat thread for blank state
    return emptyChatThread;
  }, [activeThreadId, chatThreads]);

  const handleToggleCollapse = (): void => setIsThreadColumnCollapsed(!isThreadColumnCollapsed);

  const handleCreateThread = React.useCallback(() => {
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
              selectedThreadId={activeThreadId ? currentThread.id : undefined}
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
            messages={currentThread?.messages ?? []}
            onSubmitMessage={onSubmitMessage}
            enableCompactInterface={false}
          />
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element minimumSize={200}>
          <ToolColumn mode={toolColumnMode} />
        </StudioResizableLayout.Element>
      </StudioResizableLayout.Container>
    </div>
  );
}

const emptyChatThread: ChatThread = {
  id: 'new-chat',
  title: 'Ny tråd',
  messages: [],
};
