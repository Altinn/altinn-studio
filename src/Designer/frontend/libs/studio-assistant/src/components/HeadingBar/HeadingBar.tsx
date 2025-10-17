import React from 'react';
import type { ReactElement } from 'react';
import { StudioHeading, StudioToggleGroup, StudioBadge, StudioParagraph } from '@studio/components';
import classes from './HeadingBar.module.css';
import { CodeIcon, PlayFillIcon } from '@studio/icons';
import { ToolColumnMode } from '../../types/ToolColumnMode';
import type { AssistantTexts } from '../../types/AssistantTexts';
import type { ConnectionStatus } from '../../types/ConnectionStatus';

export type HeadingBarProps = {
  texts: AssistantTexts;
  selectedToolColumnMode?: ToolColumnMode;
  onModeChange?: (mode: ToolColumnMode) => void;
  connectionStatus?: ConnectionStatus;
};

export function HeadingBar({
  texts,
  selectedToolColumnMode,
  onModeChange,
  connectionStatus,
}: HeadingBarProps): ReactElement {
  const shouldShowToggleGroup = selectedToolColumnMode && onModeChange;

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connecting':
        return { text: 'Kobler til Altinity', color: 'warning' as const };
      case 'connected':
        return { text: 'Koblet til Altinity', color: 'success' as const };
      case 'error':
        return { text: 'Kobling feilet', color: 'danger' as const };
      default:
        return { text: 'Ikke koblet til Altinity', color: 'neutral' as const };
    }
  };

  const statusDisplay = connectionStatus ? getConnectionStatusDisplay() : null;

  return (
    <div className={classes.headingBar}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
        <div>
          <StudioHeading>{texts.heading}</StudioHeading>
        </div>
        {statusDisplay && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <StudioBadge style={{ display: 'flex' }} data-color={statusDisplay.color} />
            <StudioParagraph data-size='xs'>{statusDisplay.text}</StudioParagraph>
          </div>
        )}
      </div>
      {shouldShowToggleGroup && (
        <StudioToggleGroup
          value={selectedToolColumnMode}
          onChange={(value) => onModeChange(value as ToolColumnMode)}
        >
          <StudioToggleGroup.Item value={ToolColumnMode.Preview}>
            <PlayFillIcon />
            {texts.preview}
          </StudioToggleGroup.Item>
          <StudioToggleGroup.Item value={ToolColumnMode.FileExplorer}>
            <CodeIcon />
            {texts.fileBrowser}
          </StudioToggleGroup.Item>
        </StudioToggleGroup>
      )}
    </div>
  );
}
