import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioStatusRadioGroup, type StudioStatusRadioGroupProps } from './StudioStatusRadioGroup';

const options: StudioStatusRadioGroupProps['options'] = [
  {
    value: 'value1',
    title: 'Miljø 1',
    text: 'Sist publisert 11.06.2023 kl 14:03',
    color: 'success',
  },
  {
    value: 'value2',
    title: 'Miljø 2',
    text: 'Sist publisert 11.06.2023 kl 14:03',
    color: 'success',
  },
  { value: 'value3', title: 'Miljø 3', text: 'Forløpig ingen publiseringer', color: 'info' },
  {
    value: 'value4',
    title: 'Miljø 4',
    text: 'Applikasjonen er utilgjengelig i miljø',
    color: 'info',
  },
];

type Story = StoryFn<typeof StudioStatusRadioGroup>;

const meta: Meta = {
  title: 'Components/StudioStatusRadioGroup',
  component: StudioStatusRadioGroup,
  argTypes: {},
};

export const Preview: Story = () => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>();

  return (
    <StudioStatusRadioGroup
      title='Velg et av alternativene under'
      options={options}
      onChange={(value) => setSelectedValue(value)}
      defaultValue={selectedValue}
    />
  );
};

export default meta;
