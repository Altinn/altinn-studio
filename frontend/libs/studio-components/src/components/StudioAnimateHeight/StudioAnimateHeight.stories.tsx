import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioAnimateHeight } from './StudioAnimateHeight';
import { StudioParagraph } from '../StudioParagraph';
import { StudioHeading } from '../StudioHeading';
import { StudioCard } from '../StudioCard';

type Story = StoryFn<typeof StudioAnimateHeight>;

const meta: Meta = {
  title: 'Components/StudioAnimateHeight',
  component: StudioAnimateHeight,
};
export const Preview: Story = (args): React.ReactElement => <StudioAnimateHeight {...args} />;

function PreviewText(): React.ReactElement {
  return (
    <StudioCard>
      <StudioHeading level={3}>StudioAnimateHeight</StudioHeading>
      <StudioParagraph>
        Animates open and close of a container with a height transition.
      </StudioParagraph>
      <StudioParagraph>Change the open prop to see the animation in action.</StudioParagraph>
    </StudioCard>
  );
}

Preview.args = {
  open: true,
  children: <PreviewText />,
};

export default meta;
