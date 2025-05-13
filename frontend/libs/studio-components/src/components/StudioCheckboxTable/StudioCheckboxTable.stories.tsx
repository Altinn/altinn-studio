import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioCheckboxTable } from './';
import { type StudioCheckboxTableRowElement } from './types/StudioCheckboxTableRowElement';
import { useCheckboxGroup, ValidationMessage } from '@digdir/designsystemet-react';
import { StudioTable } from '../StudioTable';
import { StudioCheckbox } from '../StudioCheckbox/StudioCheckbox';

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
  const [rowElements, setRowElements] = useState<StudioCheckboxTableRowElement[]>(options);
  const [hasError, setHasError] = useState<boolean>(
    rowElements.every((element) => !element.checked),
  );

  const { getCheckboxProps } = useCheckboxGroup({
    name: 'test',
    error: hasError ? 'Test Error' : '',
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value: string = event.target.value;
    const checked: boolean = event.target.checked;

    if (value !== 'all' && checked) {
      setHasError(false);
      const newRowElements = rowElements.map((element) =>
        element.value === value ? { ...element, checked } : element,
      );
      setRowElements(newRowElements);
    }

    if (value !== 'all' && !checked) {
      const newRowElements = rowElements.map((element) =>
        element.value === value ? { ...element, checked: false } : element,
      );

      const allAreUnchecked = newRowElements.every((element) => !element.checked);

      if (allAreUnchecked) {
        setHasError(true);
      } else {
        setHasError(false);
      }

      setRowElements(newRowElements);
    }

    if (value === 'all' && checked) {
      setHasError(false);
      setRowElements((prevRowElements) =>
        prevRowElements.map((element) => ({ ...element, checked })),
      );
    }
    if (value === 'all' && !checked) {
      setHasError(true);
      setRowElements((prevRowElements) =>
        prevRowElements.map((element) => ({ ...element, checked: false })),
      );
    }
  };

  return (
    <>
      <StudioCheckboxTable {...args}>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell>
              <StudioCheckbox
                aria-label='My story'
                aria-invalid={hasError}
                {...getCheckboxProps({
                  allowIndeterminate: true,
                  value: 'all',
                  checked: rowElements.every((element) => element.checked),
                  onChange: handleChange,
                })}
              />
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell aria-hidden>My Story</StudioTable.HeaderCell>
          </StudioTable.Row>
        </StudioTable.Head>
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
                    onChange: handleChange,
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
