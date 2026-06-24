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
        <button type='button'>Save</button>
        <button type='button'>Cancel</button>
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
        <button type='button'>Submit</button>
        <button type='button'>Draft</button>
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
        <button type='button'>Save</button>
        <button type='button'>Submit</button>
      </>
    ),
  },
};

export const WithoutLegend: Story = {
  args: {
    title: undefined,
    children: (
      <>
        <button type='button'>OK</button>
        <button type='button'>Cancel</button>
      </>
    ),
  },
};
