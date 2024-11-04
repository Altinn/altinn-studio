import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioProperty } from '../index';
import { StudioTextarea } from '../../StudioTextarea';
import { StudioButton } from '../../StudioButton';
import { TrashIcon, FloppydiskIcon, XMarkIcon } from '@studio/icons';
import { StudioTextfield } from '../../StudioTextfield';

type Story = StoryFn<typeof StudioProperty.Fieldset>;

const meta: Meta = {
  title: 'Components/StudioProperty/Fieldset',
  component: StudioProperty.Fieldset,
};
export const Preview: Story = (args): React.ReactElement => <StudioProperty.Fieldset {...args} />;

Preview.args = {
  legend: 'Contact details',
  children: (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--studio-property-fieldset-spacing)',
        margin: '0 var(--studio-property-fieldset-spacing) var(--studio-property-fieldset-spacing)',
      }}
    >
      <StudioTextfield label='Name' />
      <StudioTextarea label='Address' />
    </div>
  ),
  menubar: (
    <>
      <StudioButton variant='secondary' color='success' title='Save' icon={<FloppydiskIcon />} />
      <StudioButton variant='secondary' title='Delete' color='danger' icon={<TrashIcon />} />
      <StudioButton variant='secondary' title='Cancel' icon={<XMarkIcon />} />
    </>
  ),
};
export default meta;
