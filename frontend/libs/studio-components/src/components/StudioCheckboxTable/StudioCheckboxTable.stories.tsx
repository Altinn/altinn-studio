import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioCheckboxTable } from './';
import { type StudioCheckboxTableRowElement } from './types/StudioCheckboxTableRowElement';
import { useStudioCheckboxTableLogic } from './hook/useStudioCheckboxTableLogic';

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
            <StudioCheckboxTable.Row
              key={rowElement.value}
              label={rowElement.label}
              getCheckboxProps={{
                ...getCheckboxProps({
                  value: rowElement.value.toString(),
                  name: rowElement.label,
                  checked: rowElement.checked,
                  onChange: handleCheckboxChange,
                }),
              }}
            />
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
