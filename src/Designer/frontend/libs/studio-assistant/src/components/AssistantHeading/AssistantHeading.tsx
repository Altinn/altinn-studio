import { StudioHeading } from '@studio/components';
import classes from './AssistantHeading.module.css';
import { ToggleGroup } from '@digdir/designsystemet-react';
import { FolderFillIcon, PlayFillIcon, SidebarRightFillIcon } from '@studio/icons';

export type AssistantHeadingBarProps = {
  selectedView: 'preview' | 'fileExplorer' | 'collapse';
  onViewChange: (view: 'preview' | 'fileExplorer' | 'collapse') => void;
};

export function AssistantHeadingBar({ selectedView, onViewChange }: AssistantHeadingBarProps) {
  return (
    <div className={classes.assistantHeadingBar}>
      <StudioHeading>KI-assistent</StudioHeading>
      <ToggleGroup
        size='sm'
        value={selectedView}
        onChange={(value) => onViewChange(value as 'preview' | 'fileExplorer' | 'collapse')}
        name='toggle-group-nuts'
      >
        <ToggleGroup.Item value='preview'>
          <PlayFillIcon />
          Forhåndsvisning
        </ToggleGroup.Item>
        <ToggleGroup.Item value='fileExplorer'>
          <FolderFillIcon />
          Filutforsker
        </ToggleGroup.Item>
        <ToggleGroup.Item value='collapse'>
          <SidebarRightFillIcon />
          Skjul sidestolpe
        </ToggleGroup.Item>
      </ToggleGroup>
    </div>
  );
}
