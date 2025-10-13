import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioResizableLayout } from '@studio/components-legacy';
import { ToolColumn } from '../ToolColumn';
import classes from './InterfaceAdvanced.module.css';
import { AssistantHeadingBar } from '../AssistantHeading/AssistantHeading';
import type { AssistantConfig, ChatThread, ConnectionStatus } from '../../types/AssistantConfig';
import { ThreadColumn } from '../ThreadColumn';
import { ThreadColumnCollapsed } from '../ThreadColumnHidden';
import { ChatColumn } from '../ChatColumn/ChatColumn';
import { ViewType } from '../../types/ViewType';
import type { UserInputFlags } from '../ChatColumn/UserInput/UserInput';

export type InterfaceAdvancedProps = AssistantConfig & {
  activeThreadId?: string;
  connectionStatus?: ConnectionStatus;
  onSelectThread?: (threadId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onCreateThread?: () => void;
};

export function InterfaceAdvanced({
  texts,
  chatThreads,
  onSubmitMessage,
  activeThreadId,
  connectionStatus,
  onSelectThread,
  onDeleteThread,
  onCreateThread,
}: InterfaceAdvancedProps): ReactElement {
  const [isThreadColumnCollapsed, setIsThreadColumnCollapsed] = useState(false);
  const [selectedToolView, setSelectedView] = useState<ViewType>(ViewType.Preview);

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

  const handleToggle = () => setIsThreadColumnCollapsed(!isThreadColumnCollapsed);

  const handleCreateThread = React.useCallback(() => {
    if (onCreateThread) {
      onCreateThread();
      setIsThreadColumnCollapsed(false);
    }
  }, [onCreateThread]);

  const advancedModeFlags: UserInputFlags = {
    attachmentButton: true,
    agentModeSwitch: true,
  };

  return (
    <div className={classes.container}>
      <AssistantHeadingBar
        texts={texts}
        selectedView={selectedToolView}
        onViewChange={setSelectedView}
        connectionStatus={connectionStatus}
      />
      <div className={classes.resizableWrapper}>
        <StudioResizableLayout.Container orientation='horizontal' localStorageContext='ai-chat'>
          {isThreadColumnCollapsed ? (
            <ThreadColumnCollapsed onToggle={handleToggle} onCreateThread={handleCreateThread} />
          ) : (
            <StudioResizableLayout.Element minimumSize={200} maximumSize={350}>
              <ThreadColumn
                texts={texts}
                chatThreads={chatThreads}
                selectedThreadId={activeThreadId ? currentThread.id : undefined}
                currentSessionId={activeThreadId}
                onSelectThread={onSelectThread}
                onDeleteThread={onDeleteThread}
                onCreateThread={handleCreateThread}
              />
            </StudioResizableLayout.Element>
          )}
          <StudioResizableLayout.Element minimumSize={400}>
            <ChatColumn
              texts={texts}
              messages={currentThread?.messages ?? []}
              onSubmitMessage={onSubmitMessage}
              flags={advancedModeFlags}
              emptyPlaceholder={
                <div className={classes.emptyChatPlaceholder}>
                  <h2>{texts.heading}</h2>
                  <p>{texts.preview}</p>
                  <p>{texts.aboutAssistant}</p>
                </div>
              }
            />
          </StudioResizableLayout.Element>
          <StudioResizableLayout.Element minimumSize={200}>
            <ToolColumn selectedView={selectedToolView} />
          </StudioResizableLayout.Element>
        </StudioResizableLayout.Container>
      </div>
    </div>
  );
}

const emptyChatThread: ChatThread = {
  id: 'new-chat',
  title: 'Ny tråd',
  messages: [],
};
