import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioProperty } from '../index';
import { StudioButton } from '../../StudioButton';
import { TrashIcon, FloppydiskIcon, XMarkIcon } from '@studio/icons';
import { FieldsetContent } from './test-data/FieldsetContent';

const meta = {
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
} satisfies Meta<typeof StudioProperty.Fieldset>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    legend: 'Contact details',
    children: <FieldsetContent />,
    menubar: (
      <>
        <StudioButton variant='secondary' color='success' title='Save' icon={<FloppydiskIcon />} />
        <StudioButton variant='secondary' title='Delete' color='danger' icon={<TrashIcon />} />
        <StudioButton variant='secondary' title='Cancel' icon={<XMarkIcon />} />
      </>
    ),
  },
};
