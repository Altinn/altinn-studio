import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioList } from './StudioList';

type Story = StoryFn<typeof StudioList.Root>;

const meta: Meta = {
  title: 'Components/StudioList/Unordered',
  component: StudioList.Root,
  argTypes: {
    'data-size': {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioList.Root {...args} />;

Preview.args = {
  children: (
    <>
      <StudioList.Heading>Lorem ipsum</StudioList.Heading>
      <StudioList.Unordered data-size='sm'>
        <StudioList.Item>
          Vivamus magna turpis, ornare in lectus eget, lacinia vehicula mauris.
        </StudioList.Item>
        <StudioList.Item>In hac habitasse platea dictumst.</StudioList.Item>
        <StudioList.Item>Aliquam luctus mi erat, quis mattis sem aliquam eu.</StudioList.Item>
      </StudioList.Unordered>
    </>
  ),
};
export default meta;
