import type { ReactElement } from 'react';
import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { TestTable } from './test-data/TestTable';
import type { StudioInputTableProps } from './StudioInputTable';

type Story = StoryFn<typeof TestTable>;

export function render(props: StudioInputTableProps): ReactElement {
  return <TestTable {...props} />;
  /*  return (
    <StudioInputTable>
      <StudioInputTable.Head>
        <StudioInputTable.Row>
          <StudioInputTable.HeaderCell.Checkbox />
          <StudioInputTable.HeaderCell>Test</StudioInputTable.HeaderCell>
          <StudioInputTable.HeaderCell>Test</StudioInputTable.HeaderCell>
          <StudioInputTable.HeaderCell>Test</StudioInputTable.HeaderCell>
          <StudioInputTable.HeaderCell>Test</StudioInputTable.HeaderCell>
          <StudioInputTable.HeaderCell>Test</StudioInputTable.HeaderCell>
          <StudioInputTable.HeaderCell>Test</StudioInputTable.HeaderCell>
        </StudioInputTable.Row>
      </StudioInputTable.Head>
      <StudioInputTable.Body>
        <StudioInputTable.Row>
          <StudioInputTable.Cell.Checkbox value='tesfffft1' name='sadasdasd' />
          <StudioInputTable.Cell>dfdfg</StudioInputTable.Cell>
          <StudioInputTable.Cell>Test</StudioInputTable.Cell>
          <StudioInputTable.Cell.Textfield value='Hei, hvor det går!' />
          <StudioInputTable.Cell.Textarea value='Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque tincidunt sed lorem in pellentesque. Nam laoreet varius justo, a accumsan magna tincidunt a. Suspendisse ut iaculis turpis, at placerat ipsum. Ut cursus libero et tincidunt posuere. Maecenas interdum ante sit amet nulla iaculis accumsan. Proin vitae metus ut nisl dapibus placerat. Etiam et leo convallis, egestas tellus vel, dictum risus. Nam sed bibendum ante. Aliquam lacinia rhoncus lacinia. In hac habitasse platea dictumst. In non neque rhoncus, vestibulum lacus a, convallis massa. Praesent eget ullamcorper enim.' />
          <StudioInputTable.Cell.Textarea />
          <StudioInputTable.Cell.Button>Knapp</StudioInputTable.Cell.Button>
        </StudioInputTable.Row>
        <StudioInputTable.Row>
          <StudioInputTable.Cell.Checkbox value='test2' name='asdasdad' />
          <StudioInputTable.Cell>fdgdfg</StudioInputTable.Cell>
          <StudioInputTable.Cell>Test</StudioInputTable.Cell>
          <StudioInputTable.Cell.Textfield />
          <StudioInputTable.Cell.Textarea />
          <StudioInputTable.Cell.Textarea />
          <StudioInputTable.Cell.Button />
        </StudioInputTable.Row>
      </StudioInputTable.Body>
    </StudioInputTable>
  );*/
}

const meta: Meta<Story> = {
  title: 'Studio/StudioInputTable',
  component: TestTable,
  render,
};
export default meta;
