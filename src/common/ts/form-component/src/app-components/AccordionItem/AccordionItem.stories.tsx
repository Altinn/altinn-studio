import type { Meta, StoryObj } from '@storybook/react-vite';

import { AccordionItem } from './AccordionItem';

const meta = {
  title: 'AppComponents/AccordionItem',
  component: AccordionItem,
} satisfies Meta<typeof AccordionItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'What is included in this section?',
    defaultOpen: false,
    children: (
      <p>
        Accordion content goes here. Use this to hide secondary information until the user wants to
        see it.
      </p>
    ),
  },
};

export const Open: Story = {
  args: {
    ...Preview.args,
    defaultOpen: true,
  },
};
