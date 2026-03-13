import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDetails } from './index';
import type { StudioDetailsProps } from './StudioDetails';
import { StudioCard } from '../StudioCard';

const ComposedComponent = (args: StudioDetailsProps): ReactElement => (
  <StudioDetails {...args}>
    <StudioDetails.Summary>Details heading text</StudioDetails.Summary>
    <StudioDetails.Content>Details content</StudioDetails.Content>
  </StudioDetails>
);

const ComposedComponentInCard = (args: StudioDetailsProps): ReactElement => (
  <StudioCard>
    <StudioDetails {...args}>
      <StudioDetails.Summary>Details heading text</StudioDetails.Summary>
      <StudioDetails.Content>Details content</StudioDetails.Content>
    </StudioDetails>
  </StudioCard>
);

const meta = {
  title: 'Components/StudioDetails',
  component: StudioDetails,
} satisfies Meta<typeof StudioDetails>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: (args: StudioDetailsProps): ReactElement => <ComposedComponent {...args} />,
};

export const InCard: Story = {
  render: (args: StudioDetailsProps): ReactElement => <ComposedComponentInCard {...args} />,
};
