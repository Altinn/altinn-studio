import type { Ref } from 'react';
import React, { forwardRef, useState } from 'react';
import type { StudioTabsProps } from '@studio/components';
import {
  StudioTextResourcePicker2,
  StudioTextResourceValueEditor,
  StudioAlert,
  StudioTabs,
} from '@studio/components';
import classes from './StudioTextResourceEditor.module.css';
import type { TextResource } from '@studio/pure-functions';
import type { Override } from '../../../types/Override';

export type StudioTextResourceEditorTexts = {
  pickerLabel: string;
  valueEditorAriaLabel: string;
  valueEditorIdLabel: string;
  noTextResourceOptionLabel: string;
  disabledSearchAlertText?: string;
  tabLabelType: string;
  tabLabelSearch: string;
};

export type StudioTextResourceEditorProps = Override<
  {
    textResourceId: string;
    onTextChange?: (value: string) => void;
    onReferenceChange?: (id?: string) => void;
    textResourceValue?: string;
    disableSearch?: boolean;
    onTabChange?: (tab: StudioTextResourceTab) => void;
    textResources: TextResource[];
    texts: StudioTextResourceEditorTexts;
  },
  Omit<StudioTabsProps, 'value' | 'onChange' | 'children'>
>;

export type StudioTextResourceTab = 'type' | 'search';

function StudioTextResourceEditor(
  {
    textResourceId,
    onTextChange,
    onReferenceChange,
    textResourceValue,
    disableSearch = false,
    onTabChange,
    texts,
    textResources,
    ...rest
  }: StudioTextResourceEditorProps,
  ref: Ref<HTMLDivElement>,
): React.ReactElement {
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
      {...rest}
      ref={ref}
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
}

const ForwardedStudioTextResourceEditor = forwardRef(StudioTextResourceEditor);

ForwardedStudioTextResourceEditor.displayName = 'StudioTextResourceEditor';

export { ForwardedStudioTextResourceEditor as StudioTextResourceEditor };
