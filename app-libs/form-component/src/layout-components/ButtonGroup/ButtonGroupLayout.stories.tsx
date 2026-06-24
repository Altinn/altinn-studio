import { Button } from '@app/form-component/app-components';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ButtonGroupLayout } from './ButtonGroupLayout';
import type { ButtonGroupLayoutProps } from './ButtonGroupLayout';

export const BUTTON_GROUP_PROP_CATEGORIES = {
  id: 'config',
  title: 'config',
  description: 'config',
  help: 'config',
  grid: 'runtime',
  children: 'runtime',
} satisfies PropCategories<ButtonGroupLayoutProps>;

const meta = {
  title: 'LayoutComponents/ButtonGroup',
  component: ButtonGroupLayout,
  excludeStories: ['BUTTON_GROUP_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    id: 'button-group-preview',
    title: 'Actions',
  },
} satisfies Meta<typeof ButtonGroupLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: (
      <>
        <Button variant='primary'>Save</Button>
        <Button variant='secondary'>Cancel</Button>
      </>
    ),
  },
};

export const WithDescription: Story = {
  args: {
    title: 'Choose an action',
    description: 'Select one of the actions below.',
    children: (
      <>
        <Button variant='primary'>Submit</Button>
        <Button variant='secondary'>Draft</Button>
      </>
    ),
  },
};

export const WithHelpText: Story = {
  args: {
    title: 'Form actions',
    help: 'Use these buttons to save or submit your form.',
    children: (
      <>
        <Button variant='primary'>Save</Button>
        <Button variant='secondary'>Submit</Button>
      </>
    ),
  },
};

export const WithoutLegend: Story = {
  args: {
    title: undefined,
    children: (
      <>
        <Button variant='primary'>OK</Button>
        <Button variant='secondary'>Cancel</Button>
      </>
    ),
  },
};
