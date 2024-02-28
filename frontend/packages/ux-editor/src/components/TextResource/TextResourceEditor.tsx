import React, { useState } from 'react';
import { Tabs } from '@digdir/design-system-react';
import { TextResourceValueEditor } from './TextResourceValueEditor';
import { TextResourcePicker } from './TextResourcePicker';

export interface TextResourceProps {
  onReferenceChange: (id: string) => void;
  textResourceId: string;
}

enum TextResourceTab {
  Type = 'type',
  Search = 'search',
}

export const TextResourceEditor = ({ onReferenceChange, textResourceId }: TextResourceProps) => {
  const [tab, setTab] = useState<string>(TextResourceTab.Type);

  return (
    <Tabs size='small' value={tab} onChange={setTab}>
      <Tabs.List>
        <Tabs.Tab value={TextResourceTab.Type}>Skriv tekst</Tabs.Tab>
        <Tabs.Tab value={TextResourceTab.Search}>Søk</Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value={TextResourceTab.Type}>
        <TextResourceValueEditor
          onReferenceChange={onReferenceChange}
          textResourceId={textResourceId}
        />
      </Tabs.Content>
      <Tabs.Content value={TextResourceTab.Search}>
        <TextResourcePicker onReferenceChange={onReferenceChange} textResourceId={textResourceId} />
      </Tabs.Content>
    </Tabs>
  );
};
