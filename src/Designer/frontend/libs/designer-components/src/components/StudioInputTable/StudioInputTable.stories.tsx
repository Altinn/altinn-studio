import type { Meta, StoryObj } from '@storybook/react-vite';
import { TestTable } from './test-data/TestTable';

const meta = {
  title: 'Components/StudioInputTable',
  component: TestTable,
} satisfies Meta<typeof TestTable>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
