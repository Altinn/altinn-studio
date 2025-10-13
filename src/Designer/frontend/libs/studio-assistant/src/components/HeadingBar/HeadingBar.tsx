import React from 'react';
import { StudioHeading } from '@studio/components';
import classes from './headingBar.module.css';
import { ToggleGroup } from '@digdir/designsystemet-react';
import { CodeIcon, PlayFillIcon } from '@studio/icons';
import { ToolColumnMode } from '../../types/ToolColumnMode';
import type { AssistantTexts } from '../../types/AssistantTexts';

export type HeadingBarProps = {
  texts: AssistantTexts;
  selectedToolColumnMode?: ToolColumnMode;
  onModeChange?: (mdoe: ToolColumnMode) => void;
};

export function HeadingBar({ texts, selectedToolColumnMode, onModeChange }: HeadingBarProps) {
  const shouldShowToggleGroup = selectedToolColumnMode && onModeChange;

  return (
    <div className={classes.headingBar}>
      <StudioHeading>{texts.heading}</StudioHeading>
      {shouldShowToggleGroup && (
        // TODO: Create StudioToggleGroup component
        <ToggleGroup
          size='sm'
          value={selectedToolColumnMode}
          onChange={(value) => onModeChange(value as ToolColumnMode)}
        >
          <ToggleGroup.Item value={ToolColumnMode.Preview}>
            <PlayFillIcon />
            {texts.preview}
          </ToggleGroup.Item>
          <ToggleGroup.Item value={ToolColumnMode.FileExplorer}>
            <CodeIcon />
            {texts.fileBrowser}
          </ToggleGroup.Item>
        </ToggleGroup>
      )}
    </div>
  );
}
