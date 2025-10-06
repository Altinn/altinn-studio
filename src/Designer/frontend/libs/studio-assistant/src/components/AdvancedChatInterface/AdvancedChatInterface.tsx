import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioResizableLayout } from '@studio/components-legacy';
import { ToolColumn } from '../ToolColumn';
import classes from './AdvancedChatInterface.module.css';
import { AssistantHeadingBar } from '../AssistantHeading/AssistantHeading';
import type { ChatThread } from '../../types/ChatThread';
import type { Message } from '../../types/AssistantConfig';
import { ThreadColumn } from '../ThreadColumn';
import { ThreadColumnHidden } from '../ThreadColumnHidden';
import { ChatColumn } from '../ChatColumn/ChatColumn';

export type AdvancedChatInterfaceProps = {
  chatThreads: ChatThread[];
  currentThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onSendMessage: (message: Message) => void;
  sendButtonText: string;
  allowEditing?: boolean;
  onModeChange?: (mode: boolean) => void;
  textareaPlaceholder?: string;
  sidePanelLabels: {
    preview: string;
    fileBrowser: string;
  };
  previewContent?: ReactElement;
  fileBrowserContent?: ReactElement;
  leftSidebarCollapsed?: boolean;
  onLeftSidebarToggle?: () => void;
};

export function AdvancedChatInterface({
  chatThreads,
  currentThreadId,
  onSelectThread,
  onSendMessage,
  sendButtonText,
  allowEditing: selectedMode,
  onModeChange,
  textareaPlaceholder,
  sidePanelLabels,
  previewContent,
  fileBrowserContent,
  leftSidebarCollapsed: controlledCollapsed,
  onLeftSidebarToggle,
}: AdvancedChatInterfaceProps): ReactElement {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [selectedView, setSelectedView] = useState<'preview' | 'fileExplorer' | 'collapse'>(
    'preview',
  );

  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  const handleToggle = onLeftSidebarToggle ?? (() => setInternalCollapsed(!internalCollapsed));

  const currentThread = chatThreads.find((thread) => thread.id === currentThreadId);
  const messages = currentThread?.messages || [];

  return (
    <div className={classes.container}>
      <AssistantHeadingBar selectedView={selectedView} onViewChange={setSelectedView} />
      <div className={classes.resizableWrapper}>
        <StudioResizableLayout.Container orientation='horizontal' localStorageContext='ai-chat'>
          {isCollapsed ? (
            <ThreadColumnHidden onToggle={handleToggle} />
          ) : (
            <StudioResizableLayout.Element
              minimumSize={200}
              maximumSize={400}
              collapsed={isCollapsed}
              collapsedSize={60}
            >
              <ThreadColumn
                chatThreads={chatThreads}
                selectedThreadId={currentThreadId}
                onSelectThread={onSelectThread}
                isCollapsed={isCollapsed}
                onToggleCollapse={handleToggle}
              />
            </StudioResizableLayout.Element>
          )}
          <StudioResizableLayout.Element>
            <ChatColumn
              messages={messages}
              onSendMessage={onSendMessage}
              sendButtonText={sendButtonText}
              allowEditing={selectedMode}
              onModeChange={onModeChange}
              textareaPlaceholder={textareaPlaceholder}
            />
          </StudioResizableLayout.Element>
          {selectedView !== 'collapse' && (
            <StudioResizableLayout.Element minimumSize={250}>
              <ToolColumn
                selectedView={selectedView}
                tabLabels={sidePanelLabels}
                previewContent={previewContent}
                fileBrowserContent={fileBrowserContent}
              />
            </StudioResizableLayout.Element>
          )}
        </StudioResizableLayout.Container>
      </div>
    </div>
  );
}
