import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioList } from './StudioList';

type Story = StoryFn<typeof StudioList.Root>;

const meta: Meta = {
  title: 'Components/StudioList/Ordered',
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
      <StudioList.Ordered data-size='sm'>
        <StudioList.Item>Nunc cursus turpis eget ligula blandit lobortis.</StudioList.Item>
        <StudioList.Item>Donec et mauris id sapien laoreet placerat.</StudioList.Item>
        <StudioList.Item>
          Proin quam tortor, ullamcorper at justo nec, iaculis dapibus nisi.
        </StudioList.Item>
      </StudioList.Ordered>
    </>
  ),
};
export default meta;
