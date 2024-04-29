import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { IconViewer } from './IconViewer';

const meta: Meta = {
  title: 'Studio/Icons',
  component: IconViewer,
  parameters: {
    layout: 'fullscreen-centered',
  },
};

export const Preview: StoryFn = (): React.ReactElement => <IconViewer />;
export default meta;
