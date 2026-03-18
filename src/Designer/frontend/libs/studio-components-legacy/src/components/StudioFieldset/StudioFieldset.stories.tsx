import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioFieldset } from './StudioFieldset';

const meta = {
  title: 'Components/StudioFieldset',
  component: StudioFieldset,
  argTypes: {
    legend: {
      control: 'text',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    hideLegend: {
      control: 'boolean',
    },
    error: {
      control: 'text',
    },
  },
} satisfies Meta<typeof StudioFieldset>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children:
      'Praesent tristique dolor dolor, scelerisque tempor risus venenatis et. Proin a mauris velit. Ut vel ex vitae ligula egestas rhoncus. Quisque posuere pharetra tellus sit amet fringilla. Fusce nec velit id ex finibus hendrerit sed in mauris. Nulla porttitor, ex id vehicula ultricies, leo odio volutpat nisi, eu lobortis nisl massa non magna. Pellentesque lobortis suscipit quam, posuere posuere erat eleifend mollis. Morbi convallis porttitor odio, vulputate euismod arcu consectetur quis. Quisque tempor suscipit turpis auctor varius. Fusce sagittis orci at ipsum commodo, vel facilisis dolor venenatis. Morbi at rutrum massa. In porttitor maximus sapien, sit amet varius felis pulvinar vel.',
    size: 'sm',
    legend: 'Lorem ipsum',
    hideLegend: false,
  },
};
