import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioList } from './StudioList';

const meta = {
  title: 'Components/StudioList/Unordered',
  component: StudioList.Root,
  argTypes: {
    'data-size': {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: (
      <>
        <StudioList.Heading>Lorem ipsum</StudioList.Heading>
        <StudioList.Unordered data-size='sm'>
          <StudioList.Item>
            Vivamus magna turpis, ornare in lectus eget, lacinia vehicula mauris.
          </StudioList.Item>
          <StudioList.Item>In hac habitasse platea dictumst.</StudioList.Item>
          <StudioList.Item>Aliquam luctus mi erat, quis mattis sem aliquam eu.</StudioList.Item>
        </StudioList.Unordered>
      </>
    ),
  },
};
