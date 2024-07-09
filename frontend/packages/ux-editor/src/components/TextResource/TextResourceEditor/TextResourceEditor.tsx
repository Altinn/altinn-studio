import React, { useState } from 'react';
import { Tabs } from '@digdir/design-system-react';
import { TextResourceValueEditor } from './TextResourceValueEditor';
import { TextResourcePicker } from './TextResourcePicker';
import classes from './TextResourceEditor.module.css';
import { useTranslation } from 'react-i18next';

export interface TextResourceProps {
  textResourceId: string;
  onReferenceChange: (id: string) => void;
  onSetCurrentValue: (value: string) => void;
}

enum TextResourceTab {
  Type = 'type',
  Search = 'search',
}

export const TextResourceEditor = ({
  textResourceId,
  onReferenceChange,
  onSetCurrentValue,
}: TextResourceProps) => {
  const [tab, setTab] = useState<string>(TextResourceTab.Type);
  const { t } = useTranslation();

  return (
    <Tabs size='small' value={tab} onChange={setTab} className={classes.root}>
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
        />
      </Tabs.Content>
      <Tabs.Content value={TextResourceTab.Search}>
        <TextResourcePicker onReferenceChange={onReferenceChange} textResourceId={textResourceId} />
      </Tabs.Content>
    </Tabs>
  );
};
