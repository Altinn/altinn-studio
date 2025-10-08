import React from 'react';
import { StudioHeading } from '@studio/components';
import classes from './headingBar.module.css';
import { ToggleGroup } from '@digdir/designsystemet-react';
import { CodeIcon, PlayFillIcon } from '@studio/icons';
import { ViewType } from '../../types/ViewType';
import type { AssistantTexts } from '../../types/AssistantConfig';

export type AssistantHeadingBarProps = {
  texts: AssistantTexts;
  selectedView?: ViewType;
  onViewChange?: (view: ViewType) => void;
};

export function HeadingBar({ texts, selectedView, onViewChange }: AssistantHeadingBarProps) {
  const shouldShowToggleGroup = selectedView && onViewChange;

  return (
    <div className={classes.headnigBar}>
      <StudioHeading>{texts.heading}</StudioHeading>
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
