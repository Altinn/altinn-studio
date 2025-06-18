import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioCheckboxTable } from './';
import { useStudioCheckboxTable } from './hook/useStudioCheckboxTable';

const options = [
  { label: 'Label1', value: 'Value1', description: 'Description1' },
  { label: 'Label2', value: 'Value2' },
  { label: 'Label3', value: 'Value3', description: 'Description3' },
];
const initialValues: string[] = ['Value1', 'Value2'];

const PreviewComponent = (args): ReactElement => {
  const checkBoxTitle: string = 'My checkbox';
  const checkBoxDescription: string = 'Description';
  const errorMessage: string = 'Du må velge minst én';
  const requiredNumberOfChecked: number = 1;

  const { hasError, getCheckboxProps } = useStudioCheckboxTable(
    initialValues,
    checkBoxTitle,
    requiredNumberOfChecked,
  );

  return (
    <StudioCheckboxTable {...args} hasError={hasError} errorMessage={errorMessage}>
      <StudioCheckboxTable.Head
        title={checkBoxTitle}
        descriptionCellTitle={checkBoxDescription}
        getCheckboxProps={{
          ...getCheckboxProps({
            allowIndeterminate: true,
            value: 'all',
          }),
        }}
      />
      <StudioCheckboxTable.Body>
        {options.map((rowElement) => {
          return (
            <StudioCheckboxTable.Row
              key={rowElement.value}
              label={rowElement.label}
              description={rowElement.description ?? ''}
              getCheckboxProps={{
                ...getCheckboxProps({
                  value: rowElement.value.toString(),
                  name: rowElement.label,
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
