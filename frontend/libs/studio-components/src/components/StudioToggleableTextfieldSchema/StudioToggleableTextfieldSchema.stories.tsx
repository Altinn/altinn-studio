import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioToggleableTextfieldSchema } from './StudioToggleableTextfieldSchema';
import { KeyVerticalIcon } from '@navikt/aksel-icons';

type Story = StoryFn<typeof StudioToggleableTextfieldSchema>;

const meta: Meta = {
  title: 'Forms/StudioToggleableTextfieldSchema',
  component: StudioToggleableTextfieldSchema,
};

export const Preview: Story = (args) => (
  <StudioToggleableTextfieldSchema {...args}></StudioToggleableTextfieldSchema>
);

Preview.args = {
  viewProps: {
    variant: 'tertiary',
    size: 'small',
    children: 'My awesome value',
  },
  inputProps: {
    icon: <KeyVerticalIcon />,
    label: 'My awesome label',
    size: 'small',
    placeholder: 'Placeholder',
    error: '',
  },
};

export default meta;
