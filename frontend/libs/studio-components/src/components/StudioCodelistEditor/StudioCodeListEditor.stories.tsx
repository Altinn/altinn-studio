import type { Meta, StoryObj } from '@storybook/react';
import { StudioCodeListEditor } from './StudioCodeListEditor';

type Story = StoryObj<typeof StudioCodeListEditor>;

const meta: Meta<typeof StudioCodeListEditor> = {
  title: 'Components/StudioCodeListEditor',
  component: StudioCodeListEditor,
};
export default meta;

export const Preview: Story = {
  args: {
    codeList: [
      {
        label: 'Test 1',
        value: 'test1',
        description: 'Test 1 description',
        helpText: 'Test 1 help text',
      },
      {
        label: 'Test 2',
        value: 'test2',
        description: 'Test 2 description',
        helpText: 'Test 2 help text',
      },
      {
        label: 'Test 3',
        value: 'test3',
        description: 'Test 3 description',
        helpText: 'Test 3 help text',
      },
    ],
    texts: {
      add: 'Add',
      codeList: 'Code list',
      delete: 'Delete',
      deleteItem: (number) => `Delete item number ${number}`,
      description: 'Description',
      emptyCodeList: 'The code list is empty.',
      valueErrors: {
        duplicateValue: 'The value must be unique.',
      },
      generalError: 'The code list cannot be saved because it is not valid.',
      helpText: 'Help text',
      itemDescription: (number) => `Description for item number ${number}`,
      itemHelpText: (number) => `Help text for item number ${number}`,
      itemLabel: (number) => `Label for item number ${number}`,
      itemValue: (number) => `Value for item number ${number}`,
      label: 'Label',
      value: 'Value',
    },
  },
};
