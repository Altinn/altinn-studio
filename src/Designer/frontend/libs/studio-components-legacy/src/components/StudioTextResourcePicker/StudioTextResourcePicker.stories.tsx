import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioTextResourcePicker } from './StudioTextResourcePicker';
import { textResourcesMock } from '../../test-data/textResourcesMock';

const meta = {
  title: 'Components/StudioTextResourcePicker',
  component: StudioTextResourcePicker,
} satisfies Meta<typeof StudioTextResourcePicker>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    emptyLabel: 'Ingen mulige alternativer',
    label: 'Velg tekst',
    textResources: textResourcesMock,
    onValueChange: (id: string) => console.log(id),
    noTextResourceOptionLabel: 'Ikke oppgitt',
    required: false,
    value: 'land.NO',
  },
};

export const Empty: Story = {
  args: {
    ...Preview.args,
    value: undefined,
    required: true,
    textResources: [],
  },
};
