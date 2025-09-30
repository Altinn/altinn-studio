import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDivider } from './StudioDivider';
import classes from './StudioDivider.module.css';

const meta: Meta = {
  title: 'Components/StudioDivider',
  component: StudioDivider,
  argTypes: {
    color: {
      options: ['default', 'strong', 'subtle'],
    },
  },
};

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: () => (
    <div className={classes.storyContainer}>
      <div>
        <p>Default</p>
        <StudioDivider color='default' />
      </div>
      <div>
        <p>Strong</p>
        <StudioDivider color='strong' />
      </div>
      <div>
        <p>Subtle</p>
        <StudioDivider color='subtle' />
      </div>
    </div>
  ),
};

export default meta;
