import React, { useState } from 'react';
import {
  StudioTextResourcePicker2,
  StudioTextResourceValueEditor,
  StudioAlert,
  StudioTabs,
} from '@studio/components';
import classes from './StudioTextResourceEditor.module.css';
import type { TextResource } from 'libs/studio-pure-functions/src';

export type StudioTextResourceEditorTexts = {
  pickerLabel: string;
  valueEditorAriaLabel: string;
  valueEditorIdLabel: string;
  noTextResourceOptionLabel: string;
  disabledSearchAlertText?: string;
  tabLabelType: string;
  tabLabelSearch: string;
};

export interface StudioTextResourceEditorProps {
  textResourceId: string;
  onTextChange?: (value: string) => void;
  onReferenceChange?: (id?: string) => void;
  textResourceValue?: string;
  disableSearch?: boolean;
  onTabChange?: (tab: StudioTextResourceTab) => void;
  textResources: TextResource[];
  texts: StudioTextResourceEditorTexts;
}

export type StudioTextResourceTab = 'type' | 'search';

export const StudioTextResourceEditor = ({
  textResourceId,
  onTextChange,
  onReferenceChange,
  textResourceValue,
  disableSearch = false,
  onTabChange,
  texts,
  textResources,
}: StudioTextResourceEditorProps): React.ReactElement => {
  const [activeTab, setActiveTab] = useState<StudioTextResourceTab>('type');

  const handleTabClick = (tab: StudioTextResourceTab): void => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleReferenceChange = (id?: string): void => {
    onReferenceChange?.(id);
  };

  return (
    <StudioTabs
      value={activeTab}
      className={classes.root}
      onChange={(newValue) => handleTabClick(newValue as StudioTextResourceTab)}
    >
      <StudioTabs.List>
        <StudioTabs.Tab value={'type'}>{texts.tabLabelType}</StudioTabs.Tab>
        <StudioTabs.Tab value={'search'}>{texts.tabLabelSearch}</StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Panel value={'type'} className={classes.tabContent}>
        <StudioTextResourceValueEditor
          textResourceId={textResourceId}
          onTextChange={onTextChange}
          textResourceValue={textResourceValue}
          ariaLabel={texts.valueEditorAriaLabel}
          idLabel={texts.valueEditorIdLabel}
        />
      </StudioTabs.Panel>
      <StudioTabs.Panel value={'search'} className={classes.tabContent}>
        {disableSearch && (
          <StudioAlert data-color='info'>{texts.disabledSearchAlertText}</StudioAlert>
        )}
        {!disableSearch && (
          <StudioTextResourcePicker2
            label={texts.pickerLabel}
            noTextResourceOptionLabel={texts.noTextResourceOptionLabel}
            textResources={textResources}
            textResourceId={textResourceId}
            onReferenceChange={handleReferenceChange}
          />
        )}
      </StudioTabs.Panel>
    </StudioTabs>
  );
};
