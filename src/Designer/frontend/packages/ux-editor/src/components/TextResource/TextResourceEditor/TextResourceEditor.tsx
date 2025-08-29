import React, { useState } from 'react';
import { TextResourceValueEditor } from './TextResourceValueEditor';
import { TextResourcePicker } from './TextResourcePicker';
import classes from './TextResourceEditor.module.css';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioTabs } from '@studio/components';

export interface TextResourceEditorProps {
  textResourceId: string;
  onTextChange?: (value: string) => void;
  onReferenceChange?: (id: string) => void;
  textResourceValue?: string;
  disableSearch?: boolean;
  onTabChange?: (tab: TextResourceTab) => void;
}

enum TextResourceTab {
  Type = 'type',
  Search = 'search',
}

export const TextResourceEditor = ({
  textResourceId,
  onTextChange,
  onReferenceChange,
  textResourceValue,
  disableSearch = false,
  onTabChange,
}: TextResourceEditorProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TextResourceTab>(TextResourceTab.Type);

  const handleTabClick = (tab: TextResourceTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <StudioTabs
      data-size='small'
      value={activeTab}
      className={classes.root}
      onChange={(newValue) => handleTabClick(newValue as TextResourceTab)}
    >
      <StudioTabs.List>
        <StudioTabs.Tab value={TextResourceTab.Type}>
          {t('ux_editor.text_resource_binding_write')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={TextResourceTab.Search}>
          {t('ux_editor.text_resource_binding_search')}
        </StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Panel value={TextResourceTab.Type} className={classes.tabContent}>
        <TextResourceValueEditor
          textResourceId={textResourceId}
          onTextChange={onTextChange}
          textResourceValue={textResourceValue}
        />
      </StudioTabs.Panel>
      <StudioTabs.Panel value={TextResourceTab.Search}>
        {disableSearch && (
          <StudioAlert data-color='info'>
            {t('ux_editor.modal_properties_textResourceBindings_page_name_search_disabled')}
          </StudioAlert>
        )}
        {!disableSearch && (
          <TextResourcePicker
            onReferenceChange={onReferenceChange}
            textResourceId={textResourceId}
          />
        )}
      </StudioTabs.Panel>
    </StudioTabs>
  );
};
