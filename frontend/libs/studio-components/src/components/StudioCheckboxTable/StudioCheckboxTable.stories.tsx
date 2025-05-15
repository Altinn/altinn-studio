import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioCheckboxTable } from './';
import { type StudioCheckboxTableRowElement } from './types/StudioCheckboxTableRowElement';
import { useStudioCheckboxTableLogic } from './hook/useStudioCheckboxTableLogic';
import { StudioTable } from '../StudioTable';
import { StudioCheckbox } from '../StudioCheckbox/StudioCheckbox';
import { CHECKBOX_TABLE_ERROR_ID } from './constants';

const options: StudioCheckboxTableRowElement[] = [
  {
    value: 'Value1',
    label: 'Label1',
    checked: false,
  },
  { value: 'Value2', label: 'Label2', checked: false },
  { value: 'Value3', label: 'Label3', checked: true },
];

const PreviewComponent = (args): ReactElement => {
  const checkBoxTitle: string = 'My checkbox';
  const { rowElements, hasError, getCheckboxProps, handleCheckboxChange } =
    useStudioCheckboxTableLogic(options, checkBoxTitle);

  return (
    <StudioCheckboxTable {...args} hasError={hasError} errorMessage='Error message'>
      <StudioCheckboxTable.Head
        title={checkBoxTitle}
        getCheckboxProps={{
          ...getCheckboxProps({
            allowIndeterminate: true,
            value: 'all',
            onChange: handleCheckboxChange,
          }),
        }}
      />
      <StudioCheckboxTable.Body>
        {rowElements.map((rowElement: StudioCheckboxTableRowElement) => {
          console.log('rowElement', rowElement);
          return (
            <StudioTable.Row key={rowElement.value}>
              <StudioTable.Cell>
                <StudioCheckbox
                  aria-label={rowElement.label}
                  aria-describedby={CHECKBOX_TABLE_ERROR_ID}
                  aria-invalid={hasError}
                  {...getCheckboxProps({
                    value: rowElement.value.toString(),
                    checked: rowElement.checked,
                    onChange: handleCheckboxChange,
                    name: rowElement.label,
                  })}
                />
              </StudioTable.Cell>
              <StudioTable.Cell>{rowElement.label}</StudioTable.Cell>
            </StudioTable.Row>
          );
        })}
      </StudioCheckboxTable.Body>
    </StudioCheckboxTable>
  );
};

type Story = StoryFn<typeof StudioCheckboxTable>;

const meta: Meta = {
  title: 'Components/StudioCheckboxTable',
  component: PreviewComponent,
};
export const Preview: Story = (args): ReactElement => <PreviewComponent {...args} />;

Preview.args = {};

export default meta;
