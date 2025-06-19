import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioCheckboxTable } from './index';
import { type StudioCheckboxTableRowElement } from './types/StudioCheckboxTableRowElement';

const options: StudioCheckboxTableRowElement[] = [
  {
    value: 'Value1',
    label: 'Label1',
    description: 'Description',
    checked: false,
  },
  { value: 'Value2', label: 'Label2', checked: true },
  { value: 'Value3', label: 'Label3', checked: false },
];

const PreviewComponent = (args): React.ReactElement => {
  const [rowElements, setRowElements] = useState<StudioCheckboxTableRowElement[]>(options);

  const areAllChecked = rowElements.every((element) => element.checked);
  const isAnyChecked = rowElements.some((element) => element.checked);

  return (
    <StudioCheckboxTable {...args}>
      <StudioCheckboxTable.Header
        title='Title'
        checked={areAllChecked}
        indeterminate={isAnyChecked && !areAllChecked}
        onChange={() =>
          setRowElements(rowElements.map((element) => ({ ...element, checked: !areAllChecked })))
        }
      />
      <StudioCheckboxTable.Body>
        {rowElements.map((rowElement: StudioCheckboxTableRowElement) => (
          <StudioCheckboxTable.Row
            key={rowElement.value}
            rowElement={rowElement}
            onChange={(event) => {
              const clickedValue = event.target.value;

              // Update the clicked rowElement's `checked` value
              setRowElements((prevRowElements) =>
                prevRowElements.map((element) =>
                  element.value === clickedValue
                    ? { ...element, checked: !element.checked }
                    : element,
                ),
              );
            }}
          />
        ))}
      </StudioCheckboxTable.Body>
    </StudioCheckboxTable>
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
