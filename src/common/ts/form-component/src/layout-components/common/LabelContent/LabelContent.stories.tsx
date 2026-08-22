import { StaticLanguageTranslatorProvider } from '@app/form-component/test/StaticLanguageTranslatorProvider';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { LabelContent } from './LabelContent';

const meta = {
  title: 'LayoutComponents/Common/LabelContent',
  component: LabelContent,
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
    componentId: 'example',
    label: 'Fornavn',
  },
} satisfies Meta<typeof LabelContent>;

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
    help: 'Skriv navnet nøyaktig slik det står i passet ditt.',
    description: 'Vi bruker dette for å henvende oss til deg.',
  },
};

export const InsideAFieldsetLegend: Story = {
  render: (args) => (
    <fieldset>
      <legend>
        <LabelContent {...args} />
      </legend>
      <label>
        <input type='checkbox' /> Norge
      </label>
    </fieldset>
  ),
  args: {
    label: 'Bostedsland',
    help: 'Oppgi landene du har bodd i.',
  },
};
