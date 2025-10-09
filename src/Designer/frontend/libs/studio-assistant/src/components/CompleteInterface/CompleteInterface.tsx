import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioResizableLayout } from '@studio/components-legacy';
import { ToolColumn } from '../ToolColumn';
import classes from './CompleteInterface.module.css';
import { HeadingBar } from '../HeadingBar/HeadingBar';
import type { ChatThread } from '../../types/ChatThread';
import { ThreadColumn } from '../ThreadColumn/ThreadColumn';
import { ThreadColumnCollapsed } from '../ThreadColumnHidden';
import { ChatColumn } from '../ChatColumn/ChatColumn';
import { ViewType } from '../../types/ViewType';
import type { UserInputFlags } from '../ChatColumn/UserInput/UserInput';
import { createEmptyChatThread } from '../../utils/utils';
import type { AssistantProps } from '../../Assistant/Assistant';

type CompleteInterfaceProps = Omit<AssistantProps, 'enableCompactInterface'>;

/**
 * Full page version of the chat interface with thread history, preview and code viewer.
 */
export function CompleteInterface({
  texts,
  chatThreads,
  onSubmitMessage,
}: CompleteInterfaceProps): ReactElement {
  const [isThreadColumnCollapsed, setIsThreadColumnCollapsed] = useState(false);
  const [selectedToolView, setSelectedView] = useState<ViewType>(ViewType.Preview);
  const [currentThread, setCurrentThread] = useState<ChatThread>(
    chatThreads[0] ?? createEmptyChatThread(),
  );

  const handleToggle = () => setIsThreadColumnCollapsed(!isThreadColumnCollapsed);

  const handleChangeThread = (threadId: string) => {
    const thread = chatThreads.find((t) => t.id === threadId);
    setCurrentThread(thread);
  };

  const advancedModeFlags: UserInputFlags = {
    attachmentButton: true,
    agentModeSwitch: true,
  };

  return (
    <div className={classes.container}>
      <HeadingBar texts={texts} selectedView={selectedToolView} onViewChange={setSelectedView} />
      <div className={classes.resizableWrapper}>
        <StudioResizableLayout.Container orientation='horizontal' localStorageContext='ai-chat'>
          {isThreadColumnCollapsed ? (
            <ThreadColumnCollapsed onToggle={handleToggle} />
          ) : (
            <StudioResizableLayout.Element minimumSize={200} maximumSize={350}>
              <ThreadColumn
                texts={texts}
                chatThreads={chatThreads}
                selectedThreadId={currentThread.id}
                onSelectThread={handleChangeThread}
                onToggleCollapse={handleToggle}
              />
            </StudioResizableLayout.Element>
          )}
          <StudioResizableLayout.Element minimumSize={400}>
            <ChatColumn
              texts={texts}
              messages={currentThread?.messages ?? []}
              onSubmitMessage={onSubmitMessage}
              flags={advancedModeFlags}
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
