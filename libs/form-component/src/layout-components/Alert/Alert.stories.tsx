import { type ReactElement } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { Alert, ALERT_CONFIG_KEYS } from './Alert';

const TEXTS: Record<string, string | ReactElement> = {
  'alert.title': 'Something needs your attention',
  'alert.body': 'This is the body of the alert with more details about what happened.',
  'alert.body.rich': (
    <span>
      The body supports <strong>bold</strong> and <em>emphasised</em> inline elements.
    </span>
  ),
};

const STRINGS: Record<string, string> = {
  'alert.title': 'Something needs your attention',
  'alert.body': 'This is the body of the alert with more details about what happened.',
};

const meta = {
  title: 'LayoutComponents/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
    controls: { include: ALERT_CONFIG_KEYS },
  },
  argTypes: {
    severity: {
      control: 'radio',
      options: ['success', 'info', 'warning', 'danger'],
    },
  },
  decorators: [
    (Story) => (
      <LanguageTranslatorProvider
        lang={(key) => (key ? (TEXTS[key] ?? key) : null)}
        translate={(key) => STRINGS[key] ?? key}
        TranslateComponent={({ tKey }) => TEXTS[tKey] ?? tKey}
      >
        <Story />
      </LanguageTranslatorProvider>
    ),
  ],
  args: {
    severity: 'info',
    title: 'alert.title',
    body: 'alert.body',
  },
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Success: Story = {
  args: { severity: 'success' },
};

export const Warning: Story = {
  args: { severity: 'warning' },
};

export const Danger: Story = {
  args: { severity: 'danger' },
};

export const TitleOnly: Story = {
  args: { body: undefined },
};

export const RichBody: Story = {
  args: { body: 'alert.body.rich' },
};
