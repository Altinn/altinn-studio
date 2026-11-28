import { renderWithImmediateArgs } from '@app/storybook/renderWithImmediateArgs';
import type { StoryArgsProps } from '@app/storybook/renderWithImmediateArgs';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextArea } from './TextArea';
import type { TextAreaWithLabelProps } from './TextArea';

const Wrapper = ({ args, updateArgs }: StoryArgsProps<TextAreaWithLabelProps>) => (
  <TextArea {...args} onChange={(value) => updateArgs({ value })} />
);

const meta = {
  title: 'AppComponents/TextArea',
  component: TextArea,
  args: {
    onChange: () => {},
  },
  render: renderWithImmediateArgs(Wrapper),
} satisfies Meta<typeof TextArea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'textarea-default',
    value: 'Some text content',
  },
};

export const WithCharacterLimit: Story = {
  args: {
    id: 'textarea-character-limit',
    value: 'Counted text',
    characterLimit: {
      limit: 100,
      under: '%d characters remaining',
      over: '%d characters too many',
    },
  },
};

export const ReadOnly: Story = {
  args: {
    id: 'textarea-read-only',
    value: 'This text cannot be edited',
    readOnly: true,
  },
};
