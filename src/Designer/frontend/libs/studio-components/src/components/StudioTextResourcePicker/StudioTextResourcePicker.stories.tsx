import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
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
    onValueChange: (id: string | null) => console.log(id),
    noTextResourceOptionLabel: 'Ikke oppgitt',
    required: false,
    value: 'land.NO',
  },
  render: (args) => {
    const [value, setValue] = useState<string | undefined>(args.value as string | undefined);
    return (
      <StudioTextResourcePicker
        {...args}
        value={value}
        onValueChange={(id) => {
          setValue(id ?? undefined);
          args.onValueChange?.(id ?? null);
        }}
      />
    );
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
