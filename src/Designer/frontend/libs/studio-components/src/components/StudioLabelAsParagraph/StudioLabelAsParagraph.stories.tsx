import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioLabelAsParagraph } from './StudioLabelAsParagraph';

type Story = StoryFn<typeof StudioLabelAsParagraph>;

const meta: Meta = {
  title: 'Components/StudioLabelAsParagraph',
  component: StudioLabelAsParagraph,
};
export const Preview: Story = (args): React.ReactElement => <StudioLabelAsParagraph {...args} />;

Preview.args = {
  children: 'Paragraph in bold',
};

export default meta;
