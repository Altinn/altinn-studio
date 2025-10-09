import { StudioHeading, StudioParagraph } from '@studio/components';
import classes from './AssistantHeading.module.css';
import { ToggleGroup } from '@digdir/designsystemet-react';
import { StudioBadge } from '@studio/components';
import { CodeIcon, PlayFillIcon } from '@studio/icons';
import { ViewType } from '../../types/ViewType';
import type { AssistantTexts, ConnectionStatus } from '../../types/AssistantConfig';

export type AssistantHeadingBarProps = {
  texts: AssistantTexts;
  selectedView?: ViewType;
  onViewChange?: (view: ViewType) => void;
  connectionStatus?: ConnectionStatus;
};

export function AssistantHeadingBar({
  texts,
  selectedView,
  onViewChange,
  connectionStatus,
}: AssistantHeadingBarProps) {
  const shouldShowToggleGroup = selectedView && onViewChange;

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
    <div className={classes.assistantHeadingBar}>
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
        <ToggleGroup
          size='sm'
          value={selectedView}
          onChange={(value) => onViewChange(value as ViewType)}
        >
          <ToggleGroup.Item value={ViewType.Preview}>
            <PlayFillIcon />
            {texts.preview}
          </ToggleGroup.Item>
          <ToggleGroup.Item value={ViewType.FileExplorer}>
            <CodeIcon />
            {texts.fileBrowser}
          </ToggleGroup.Item>
        </ToggleGroup>
      )}
    </div>
  );
}
