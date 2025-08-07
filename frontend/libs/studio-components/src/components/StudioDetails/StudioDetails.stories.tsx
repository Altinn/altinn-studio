import React from 'react';
import type { ReactElement } from 'react';
import type { Meta } from '@storybook/react-vite';
import { StudioDetails } from './index';
import { StudioCard } from '../StudioCard';

const ComposedComponent = (args): ReactElement => (
  <StudioDetails {...args}>
    <StudioDetails.Summary>Details heading text</StudioDetails.Summary>
    <StudioDetails.Content>Details content</StudioDetails.Content>
  </StudioDetails>
);

const ComposedComponentInCard = (args): ReactElement => (
  <StudioCard>
    <StudioDetails {...args}>
      <StudioDetails.Summary>Details heading text</StudioDetails.Summary>
      <StudioDetails.Content>Details content</StudioDetails.Content>
    </StudioDetails>
  </StudioCard>
);

const meta: Meta<typeof StudioDetails> = {
  title: 'Components/StudioDetails',
  component: StudioDetails,
  argTypes: {
    'data-size': {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export const Preview = (args): ReactElement => <ComposedComponent {...args} />;

export const InCard = (args): ReactElement => <ComposedComponentInCard {...args} />;

Preview.args = {
  'data-size': 'sm',
};

InCard.args = {
  'data-size': 'sm',
};

export default meta;
