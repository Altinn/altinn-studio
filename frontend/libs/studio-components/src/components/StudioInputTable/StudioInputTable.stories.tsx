import { Meta, StoryObj } from '@storybook/react';
import { StudioInputTable } from './StudioInputTable';
import React, { ReactNode } from 'react';

type PreviewArgs = {
  children: ReactNode;
};

const render = ({ children }: PreviewArgs) => (
  <StudioInputTable>
    <StudioInputTable.Head>
      <StudioInputTable.Row>
        <StudioInputTable.HeaderCell>Test</StudioInputTable.HeaderCell>
      </StudioInputTable.Row>
    </StudioInputTable.Head>
    <StudioInputTable.Body>
      <StudioInputTable.Row>
        <StudioInputTable.Cell>Test</StudioInputTable.Cell>
      </StudioInputTable.Row>
    </StudioInputTable.Body>
  </StudioInputTable>
);

const meta: Meta<PreviewArgs> = {
  title: 'Forms/StudioInputTable',
  component: StudioInputTable,
  render,
};

export default meta;

type Story = StoryObj<PreviewArgs>;

export const Default: Story = {
  args: {
    children: 'sadsadasdsa',
  },
};
