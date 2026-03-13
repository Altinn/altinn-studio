import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComposedComponent } from './test-data/ComposedComponent';
import { buttons } from './test-data/buttons';
import { Decorator } from './storybook-utils/Decorator';

const meta = {
  title: 'Components/StudioProperty',
  component: ComposedComponent,
  decorators: [
    (Story): ReactElement => (
      <Decorator>
        <Story />
      </Decorator>
    ),
  ],
} satisfies Meta<typeof ComposedComponent>;
export default meta;

type PreviewStory = StoryObj<PreviewProps>;

export const Preview: PreviewStory = {
  args: { buttons },
};

type PreviewProps = {
  buttons: PreviewButtonProps[];
};

type PreviewButtonProps = {
  property: string;
  value: string;
};
