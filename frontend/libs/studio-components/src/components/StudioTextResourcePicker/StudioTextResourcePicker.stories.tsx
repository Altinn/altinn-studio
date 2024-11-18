import type { Meta, StoryObj } from '@storybook/react';
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
    label: 'Velg tekst',
    emptyListText: 'Fant ingen tekster',
    textResources: textResourcesMock,
    onValueChange: (id: string) => console.log(id),
    value: 'land.NO',
  },
};
