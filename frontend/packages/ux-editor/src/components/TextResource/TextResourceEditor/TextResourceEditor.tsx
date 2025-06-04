import React from 'react';
import { Tabs } from '@digdir/designsystemet-react';
import { TextResourceValueEditor } from './TextResourceValueEditor';
import { TextResourcePicker } from './TextResourcePicker';
import classes from './TextResourceEditor.module.css';
import { useTranslation } from 'react-i18next';

export interface TextResourceProps {
  textResourceId: string;
  onReferenceChange: (id: string) => void;
  onSetCurrentValue: (value: string) => void;
  textResourceValue?: string;
}

enum TextResourceTab {
  Type = 'type',
  Search = 'search',
}

export const TextResourceEditor = ({
  textResourceId,
  onReferenceChange,
  onSetCurrentValue,
  textResourceValue,
}: TextResourceProps) => {
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
          onSetCurrentValue={onSetCurrentValue}
          textResourceValue={textResourceValue}
        />
      </Tabs.Content>
      <Tabs.Content value={TextResourceTab.Search}>
        <TextResourcePicker onReferenceChange={onReferenceChange} textResourceId={textResourceId} />
      </Tabs.Content>
    </Tabs>
  );
};
