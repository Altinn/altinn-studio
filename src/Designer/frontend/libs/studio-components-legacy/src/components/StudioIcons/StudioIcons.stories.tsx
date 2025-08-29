import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioIconViewer } from './StudioIconViewer';

const meta: Meta = {
  title: 'Icons/StudioIcons',
  component: StudioIconViewer,
  parameters: {
    layout: 'fullscreen-centered',
  },
};

export const Preview: StoryFn = (): React.ReactElement => <StudioIconViewer />;
export default meta;
