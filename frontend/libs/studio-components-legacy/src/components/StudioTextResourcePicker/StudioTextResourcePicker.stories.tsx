import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioTextResourcePicker } from './StudioTextResourcePicker';
import { textResourcesMock } from '../../test-data/textResourcesMock';

type Story = StoryObj<typeof StudioTextResourcePicker>;

const meta: Meta<typeof StudioTextResourcePicker> = {
  title: 'Components/StudioTextResourcePicker',
  component: StudioTextResourcePicker,
};
export default meta;

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
