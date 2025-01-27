import type { Meta, StoryObj } from '@storybook/react';
import { textResourcesMock } from '../../test-data/textResourcesMock';
import { StudioTextResourceInput } from './StudioTextResourceInput';
import { ArrayUtils } from '@studio/pure-functions';
import React from 'react';
import { FixedWidthDecorator } from '../../storybook-utils/decorators/FixedWidthDecorator';

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
      <FixedWidthDecorator>
        <Story />
      </FixedWidthDecorator>
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
      idLabel: 'ID:',
      search: 'Søk',
      textResourcePickerLabel: 'Velg tekstressurs',
      noTextResourceOptionLabel: 'Ikke oppgitt',
      valueLabel: 'Tekstverdi',
    },
  },
};
