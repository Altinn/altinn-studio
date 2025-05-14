import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioCheckboxTable } from './';
import { type StudioCheckboxTableRowElement } from './types/StudioCheckboxTableRowElement';
import { useCheckboxGroup, ValidationMessage } from '@digdir/designsystemet-react';
import { StudioTable } from '../StudioTable';
import { StudioCheckbox } from '../StudioCheckbox/StudioCheckbox';
import { useCheckboxTableLogic } from './hook/useStudioCheckboxTableLogic';

const options: StudioCheckboxTableRowElement[] = [
  {
    value: 'Value1',
    label: 'Label1',
    checked: false,
  },
  { value: 'Value2', label: 'Label2', checked: false },
  { value: 'Value3', label: 'Label3', checked: false },
];

const PreviewComponent = (args): React.ReactElement => {
  const { rowElements, hasError, getCheckboxProps, handleCheckboxChange } =
    useCheckboxTableLogic(options);

  return (
    <>
      <StudioCheckboxTable {...args} hasError={hasError}>
        <StudioCheckboxTable.Head
          title='My story'
          getCheckboxProps={{
            ...getCheckboxProps({
              allowIndeterminate: true,
              value: 'all',
              onChange: handleCheckboxChange,
            }),
          }}
        />
        <StudioCheckboxTable.Body>
          {rowElements.map((rowElement: StudioCheckboxTableRowElement) => (
            <StudioTable.Row key={rowElement.value}>
              <StudioTable.Cell>
                <StudioCheckbox
                  aria-labelledby={rowElement.value}
                  aria-describedby='validation-message'
                  aria-invalid={hasError}
                  {...getCheckboxProps({
                    value: rowElement.value.toString(),
                    checked: rowElement.checked,
                    onChange: handleCheckboxChange,
                  })}
                />
              </StudioTable.Cell>
              <StudioTable.Cell id={rowElement.value}>{rowElement.label}</StudioTable.Cell>
            </StudioTable.Row>
          ))}
        </StudioCheckboxTable.Body>
      </StudioCheckboxTable>
      {hasError && (
        <ValidationMessage id='validation-message'>
          Du må velge minst et alternativ
        </ValidationMessage>
      )}
    </>
  );
};

type Story = StoryFn<typeof StudioCheckboxTable>;

const meta: Meta = {
  title: 'Components/StudioCheckboxTable',
  component: PreviewComponent,
};
export const Preview: Story = (args): React.ReactElement => <PreviewComponent {...args} />;

Preview.args = {};

export default meta;
