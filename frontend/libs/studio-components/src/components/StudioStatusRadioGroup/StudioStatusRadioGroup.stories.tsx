import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioStatusRadioGroup, type StudioStatusRadioGroupProps } from './StudioStatusRadioGroup';

const options: StudioStatusRadioGroupProps['options'] = [
  {
    value: 'prod',
    title: 'Produksjon',
    text: 'Sist publisert 11.06.2023 kl 14:03',
    color: 'green',
  },
  { value: 'at02', title: 'AT02', text: 'Sist publisert 11.06.2023 kl 14:03', color: 'blue' },
  { value: 'at21', title: 'AT21', text: 'Forløpig ingen publiseringer', color: 'red' },
  { value: 'at22', title: 'AT22', text: 'Forløpig ingen publiseringer', color: 'red' },
];

type Story = StoryFn<typeof StudioStatusRadioGroup>;

const meta: Meta = {
  title: 'Components/StudioStatusRadioGroup',
  component: StudioStatusRadioGroup,
  argTypes: {},
};

export const Preview: Story = (args) => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>();

  return (
    <StudioStatusRadioGroup
      name='Test'
      options={options}
      onChange={(value) => setSelectedValue(value)}
      defaultValue={selectedValue}
    ></StudioStatusRadioGroup>
  );
};

Preview.args = {
  options,
};

export default meta;
