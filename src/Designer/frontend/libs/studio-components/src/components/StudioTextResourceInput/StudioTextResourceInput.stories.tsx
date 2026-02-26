import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { textResourcesMock } from '../../test-data/textResourcesMock';
import { StudioTextResourceInput } from './StudioTextResourceInput';
import { ArrayUtils } from '@studio/pure-functions';
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
    (Story): React.ReactElement => (
      <FixedWidthDecorator>
        <Story />
      </FixedWidthDecorator>
    ),
  ],
};
export default meta;

export const WithId: Story = {
  args: {
    currentId: 'land.NO',
    textResources: textResourcesMock,
    texts: {
      editValue: 'Rediger verdi',
      emptyTextResourceList: 'Ingen tekstressurser er tilgjengelige',
      idLabel: 'ID:',
      search: 'Søk',
      textResourcePickerLabel: 'Velg tekstressurs',
      noTextResourceOptionLabel: 'Ikke oppgitt',
      valueLabel: 'Tekstverdi',
    },
  },
};

export const WithoutId: Story = {
  args: {
    ...WithId.args,
    currentId: undefined,
  },
};
