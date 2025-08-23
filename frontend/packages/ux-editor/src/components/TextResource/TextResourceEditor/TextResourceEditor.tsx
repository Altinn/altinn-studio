import React from 'react';
import { Tabs } from '@digdir/designsystemet-react';
import { TextResourceValueEditor } from './TextResourceValueEditor';
import { TextResourcePicker } from './TextResourcePicker';
import classes from './TextResourceEditor.module.css';
import { useTranslation } from 'react-i18next';
import { StudioAlert } from '@studio/components';

export interface TextResourceEditorProps {
  textResourceId: string;
  onTextChange?: (value: string) => void;
  onReferenceChange?: (id: string) => void;
  textResourceValue?: string;
  disableSearch?: boolean;
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
}: TextResourceEditorProps) => {
  const { t } = useTranslation();

  return (
    <Tabs size='small' defaultValue={TextResourceTab.Type} className={classes.root}>
      <Tabs.List>
        <Tabs.Tab value={TextResourceTab.Type}>
          {t('ux_editor.text_resource_binding_write')}
        </Tabs.Tab>
        <Tabs.Tab value={TextResourceTab.Search}>
          {t('ux_editor.text_resource_binding_search')}
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value={TextResourceTab.Type} className={classes.tabContent}>
        <TextResourceValueEditor
          textResourceId={textResourceId}
          onTextChange={onTextChange}
          textResourceValue={textResourceValue}
        />
      </Tabs.Content>
      <Tabs.Content value={TextResourceTab.Search}>
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
      </Tabs.Content>
    </Tabs>
  );
};
