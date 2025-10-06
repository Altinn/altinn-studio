import { StudioHeading } from '@studio/components';
import classes from './AssistantHeading.module.css';
import { ToggleGroup } from '@digdir/designsystemet-react';
import { CodeIcon, PlayFillIcon } from '@studio/icons';
import { ViewType } from '../../types/ViewType';

export type AssistantHeadingBarProps = {
  selectedView: ViewType;
  onViewChange: (view: ViewType) => void;
};

export function AssistantHeadingBar({ selectedView, onViewChange }: AssistantHeadingBarProps) {
  return (
    <div className={classes.assistantHeadingBar}>
      <StudioHeading>KI-assistent</StudioHeading>
      <ToggleGroup
        size='sm'
        value={selectedView}
        onChange={(value) => onViewChange(value as ViewType)}
      >
        <ToggleGroup.Item value={ViewType.Preview}>
          <PlayFillIcon />
          Forhåndsvis
        </ToggleGroup.Item>
        <ToggleGroup.Item value={ViewType.FileExplorer}>
          <CodeIcon />
          Kode
        </ToggleGroup.Item>
      </ToggleGroup>
    </div>
  );
}
