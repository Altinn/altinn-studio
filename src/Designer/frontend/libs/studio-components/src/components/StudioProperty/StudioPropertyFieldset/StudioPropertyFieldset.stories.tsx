import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioProperty } from '../index';
import { StudioButton } from '../../StudioButton';
import { TrashIcon, FloppydiskIcon, XMarkIcon } from '../../../../../studio-icons';
import { FieldsetContent } from './test-data/FieldsetContent';

type Story = StoryFn<typeof StudioProperty.Fieldset>;

const meta: Meta = {
  title: 'Components/StudioProperty/Fieldset',
  component: StudioProperty.Fieldset,
  argTypes: {
    children: {
      table: { disable: true },
    },
    menubar: {
      table: { disable: true },
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioProperty.Fieldset {...args} />;

Preview.args = {
  legend: 'Contact details',
  children: <FieldsetContent />,
  menubar: (
    <>
      <StudioButton
        variant='secondary'
        data-color='success'
        title='Save'
        icon={<FloppydiskIcon />}
      />
      <StudioButton variant='secondary' title='Delete' data-color='danger' icon={<TrashIcon />} />
      <StudioButton variant='secondary' title='Cancel' icon={<XMarkIcon />} />
    </>
  ),
};
export default meta;
