import { useState } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioMarkdownEditor } from './StudioMarkdownEditor';
import type { StudioMarkdownEditorProps } from './StudioMarkdownEditor';
import { texts } from './test-data/texts';

const meta = {
  title: 'Components/StudioMarkdownEditor',
  component: StudioMarkdownEditor,
  argTypes: {
    defaultMode: {
      control: 'radio',
      options: ['preview', 'markdown'],
    },
  },
} satisfies Meta<typeof StudioMarkdownEditor>;
export default meta;

type Story = StoryObj<typeof meta>;

const exampleMarkdown = `## Om tjenesten

Denne tjenesten brukes til å **søke om tilskudd**. Les mer på [altinn.no](https://www.altinn.no).

Du trenger:

- Organisasjonsnummer
- Kontonummer
  1. Norsk konto
  2. Utenlandsk konto

> Søknaden må sendes innen fristen.

Bruk \`kode\` eller ~~gjennomstreking~~ ved behov.`;

function ControlledEditor(props: StudioMarkdownEditorProps): ReactElement {
  const [markdown, setMarkdown] = useState<string>(props.value ?? '');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <StudioMarkdownEditor {...props} value={markdown} onChange={setMarkdown} />
      <pre data-testid='markdown-output' style={{ whiteSpace: 'pre-wrap' }}>
        {markdown}
      </pre>
    </div>
  );
}

export const Preview: Story = {
  render: (args) => <ControlledEditor {...args} />,
  args: {
    label: 'Beskrivelse',
    texts,
    value: exampleMarkdown,
    defaultMode: 'preview',
  },
};

export const Empty: Story = {
  render: (args) => <ControlledEditor {...args} />,
  args: {
    label: 'Beskrivelse',
    texts,
    value: '',
  },
};
