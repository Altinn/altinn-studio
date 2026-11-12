import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioTextarea } from './StudioTextarea';

const meta = {
  title: 'Components/StudioTextarea',
  component: StudioTextarea,
  argTypes: {
    required: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof StudioTextarea>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: (args) => {
    const computedTagText = args.required ? 'Må fylles ut' : 'Valgfritt';

    return <StudioTextarea {...args} tagText={computedTagText}></StudioTextarea>;
  },

  args: {
    label: 'Textarea komponent',
    description: 'Beskrivelse',
    error: '',
    required: false,
    rows: 4,
  },
};
