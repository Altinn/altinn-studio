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
      },
      {
        label: 'Test 2',
        value: 'test2',
        description: 'Test 2 description',
      },
      {
        label: 'Test 3',
        value: 'test3',
        description: 'Test 3 description',
      },
    ],
    texts: {
      add: 'Add',
      codeList: 'Code list',
      delete: 'Delete',
      deleteItem: (number) => `Delete item number ${number}`,
      description: 'Description',
      emptyCodeList: 'The code list is empty.',
      itemDescription: (number) => `Description for item number ${number}`,
      itemLabel: (number) => `Label for item number ${number}`,
      itemValue: (number) => `Value for item number ${number}`,
      label: 'Label',
      value: 'Value',
    },
  },
};
