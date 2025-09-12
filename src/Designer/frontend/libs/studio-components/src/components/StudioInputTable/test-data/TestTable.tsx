import type { ReactElement } from 'react';
import React from 'react';
import { StudioInputTable } from '../index';
import * as testData from './testTableData';
import type { StudioInputTableProps } from '../StudioInputTable';
import {
  buttonHeader,
  headerCheckboxLabel,
  textfieldHeader,
  textareaHeader,
  textHeader,
} from './testTableData';

export function TestTable(props: StudioInputTableProps): ReactElement {
  return (
    <StudioInputTable {...props}>
      <StudioInputTable.Head>
        <StudioInputTable.Row>
          <StudioInputTable.HeaderCell.Checkbox label={headerCheckboxLabel} />
          <StudioInputTable.HeaderCell>{textHeader}</StudioInputTable.HeaderCell>
          <StudioInputTable.HeaderCell>{textfieldHeader}</StudioInputTable.HeaderCell>
          <StudioInputTable.HeaderCell>{textareaHeader}</StudioInputTable.HeaderCell>
          <StudioInputTable.HeaderCell>{buttonHeader}</StudioInputTable.HeaderCell>
        </StudioInputTable.Row>
      </StudioInputTable.Head>
      <StudioInputTable.Body>
        <TestRow rowNumber={1} />
        <TestRow rowNumber={2} />
        <TestRow rowNumber={3} />
      </StudioInputTable.Body>
    </StudioInputTable>
  );
}

type TestRowProps = {
  rowNumber: number;
};

function TestRow({ rowNumber: rn }: TestRowProps): ReactElement {
  return (
    <StudioInputTable.Row>
      <StudioInputTable.Cell.Checkbox
        label={testData.checkboxLabel(rn)}
        name={testData.checkboxName(rn)}
        value={testData.checkboxValue(rn)}
      />
      <StudioInputTable.Cell>{testData.cleanText(rn)}</StudioInputTable.Cell>
      <StudioInputTable.Cell.Textfield
        name={testData.textfieldName(rn)}
        label={testData.textfieldLabel(rn)}
      />
      <StudioInputTable.Cell.Textarea
        name={testData.textareaName(rn)}
        label={testData.textareaLabel(rn)}
      />
      <StudioInputTable.Cell.Button>{testData.buttonLabel(rn)}</StudioInputTable.Cell.Button>
    </StudioInputTable.Row>
  );
}
