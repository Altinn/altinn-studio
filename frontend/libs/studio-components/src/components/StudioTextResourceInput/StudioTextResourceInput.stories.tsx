import type { Meta, StoryObj } from '@storybook/react';
import { textResourcesMock } from '../../test-data/textResourcesMock';
import { StudioTextResourceInput } from './StudioTextResourceInput';
import { ArrayUtils } from '@studio/pure-functions';
import React from 'react';
import { Decorator } from './storybook-utils/Decorator';

type Story = StoryObj<typeof StudioTextResourceInput>;

const meta: Meta<typeof StudioTextResourceInput> = {
  title: 'Components/StudioTextResourceInput',
  component: StudioTextResourceInput,
  argTypes: {
    currentId: {
      control: {
        type: 'select',
        options: ArrayUtils.mapByKey(textResourcesMock, 'id'),
      },
    },
  },
  parameters: {
    actions: { argTypesRegex: '^on.+' },
  },
  decorators: [
    (Story) => (
      <Decorator>
        <Story />
      </Decorator>
    ),
  ],
};
export default meta;

export const Preview: Story = {
  args: {
    currentId: 'land.NO',
    textResources: textResourcesMock,
    texts: {
      editValue: 'Rediger verdi',
      emptyResourceList: 'Fant ingen tekstressurser',
      idLabel: 'ID:',
      search: 'Søk',
      textResourcePickerLabel: 'Velg tekstressurs',
      valueLabel: 'Tekstverdi',
    },
  },
};
