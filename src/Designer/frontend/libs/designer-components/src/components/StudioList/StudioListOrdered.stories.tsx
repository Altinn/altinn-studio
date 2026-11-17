import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioList } from './StudioList';

const meta = {
  title: 'Components/StudioList/Ordered',
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
        <StudioList.Ordered data-size='sm'>
          <StudioList.Item>Nunc cursus turpis eget ligula blandit lobortis.</StudioList.Item>
          <StudioList.Item>Donec et mauris id sapien laoreet placerat.</StudioList.Item>
          <StudioList.Item>
            Proin quam tortor, ullamcorper at justo nec, iaculis dapibus nisi.
          </StudioList.Item>
        </StudioList.Ordered>
      </>
    ),
  },
};
