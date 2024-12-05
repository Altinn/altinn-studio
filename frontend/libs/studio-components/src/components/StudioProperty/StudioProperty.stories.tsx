import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { ComposedComponent } from './test-data/ComposedComponent';
import { buttons } from './test-data/buttons';
import { Decorator } from './storybook-utils/Decorator';

const meta: Meta = {
  title: 'Components/StudioProperty',
  component: ComposedComponent,
  decorators: [
    (Story) => (
      <Decorator>
        <Story />
      </Decorator>
    ),
  ],
};

export const Preview: PreviewStory = (args): React.ReactElement => <ComposedComponent {...args} />;

Preview.args = { buttons };

type PreviewProps = {
  buttons: PreviewButtonProps[];
};

type PreviewButtonProps = {
  property: string;
  value: string;
};

type PreviewStory = StoryFn<PreviewProps>;

export default meta;
