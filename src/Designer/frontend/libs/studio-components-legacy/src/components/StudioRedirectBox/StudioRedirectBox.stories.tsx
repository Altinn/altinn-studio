import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioRedirectBox } from './StudioRedirectBox';
import { StudioParagraph } from '../StudioParagraph';

type Story = StoryFn<typeof StudioRedirectBox>;

const meta: Meta = {
  title: 'Components/StudioRedirectBox',
  component: StudioRedirectBox,
  argTypes: {
    title: {
      control: 'text',
    },
  },
};

export const Preview: Story = (args): React.ReactElement => <StudioRedirectBox {...args} />;

Preview.args = {
  title: 'title',
  children: <StudioParagraph size='sm'>Children text</StudioParagraph>,
};

export default meta;
