import { StaticLanguageTranslatorProvider } from '@app/form-component/test/StaticLanguageTranslatorProvider';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { LabelComponent } from './LabelComponent';

const meta = {
  title: 'LayoutComponents/Common/LabelComponent',
  component: LabelComponent,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <StaticLanguageTranslatorProvider>
        <Story />
      </StaticLanguageTranslatorProvider>
    ),
  ],
  args: {
    htmlFor: 'example',
    title: 'First name',
  },
} satisfies Meta<typeof LabelComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const Optional: Story = {
  args: {
    showOptionalMarking: true,
  },
};

export const WithHelpAndDescription: Story = {
  args: {
    help: 'Enter the name exactly as written in your passport.',
    description: 'We use this to address you.',
  },
};
