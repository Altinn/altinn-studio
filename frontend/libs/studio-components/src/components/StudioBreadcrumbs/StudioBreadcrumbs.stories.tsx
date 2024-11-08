import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';

import { StudioBreadcrumbs } from '.';

export default {
  title: 'Components/StudioBreadcrumbs',
  component: StudioBreadcrumbs,
  args: {
    'aria-label': 'You are here:',
  },
} as Meta;

export const Preview: StoryFn<typeof StudioBreadcrumbs> = (args) => (
  <StudioBreadcrumbs {...args}>
    <StudioBreadcrumbs.List>
      <StudioBreadcrumbs.Item>
        <StudioBreadcrumbs.Link href='#'>Level 1</StudioBreadcrumbs.Link>
      </StudioBreadcrumbs.Item>
      <StudioBreadcrumbs.Item>
        <StudioBreadcrumbs.Link href='#'>Level 2</StudioBreadcrumbs.Link>
      </StudioBreadcrumbs.Item>
      <StudioBreadcrumbs.Item>
        <StudioBreadcrumbs.Link href='#'>Level 3</StudioBreadcrumbs.Link>
      </StudioBreadcrumbs.Item>
      <StudioBreadcrumbs.Item>
        <StudioBreadcrumbs.Link href='#'>Level 4</StudioBreadcrumbs.Link>
      </StudioBreadcrumbs.Item>
    </StudioBreadcrumbs.List>
  </StudioBreadcrumbs>
);

export const Back: StoryFn<typeof StudioBreadcrumbs> = (args) => (
  <StudioBreadcrumbs {...args}>
    <StudioBreadcrumbs.Link href='#' aria-label='Back to level 3'>
      Level 3
    </StudioBreadcrumbs.Link>
  </StudioBreadcrumbs>
);
