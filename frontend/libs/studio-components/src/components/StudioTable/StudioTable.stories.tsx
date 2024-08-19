import type { ReactElement } from 'react';
import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import type { StudioTableProps } from './index';
import { StudioTable } from './index';
import { StudioCheckbox } from '../StudioCheckbox';

type Story = StoryFn<typeof StudioTable>;

export function render(props: StudioTableProps): ReactElement {
  return (
    <StudioTable {...props}>
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.HeaderCell>Test</StudioTable.HeaderCell>
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        <StudioTable.Row>
          <StudioTable.Cell>
            <StudioCheckbox value={'test1'} />
          </StudioTable.Cell>
        </StudioTable.Row>
        <StudioTable.Row>
          <StudioTable.Cell>
            <StudioCheckbox value={'test2'} />
          </StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Body>
    </StudioTable>
  );
}

const meta: Meta<Story> = {
  title: 'Studio/StudioTable',
  component: StudioTable,
  render,
};
export default meta;
