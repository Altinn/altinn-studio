import React from 'react';
import { StudioHeading, StudioToggleGroup } from '@studio/components';
import classes from './HeadingBar.module.css';
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
