import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StudioRecommendedNextAction } from './index';
import type { StudioRecommendedNextActionProps } from './index';
import { StudioIconTextfield } from '../StudioIconTextfield';
import { KeyVerticalIcon } from '../../../../studio-icons/src';

type PreviewProps = Omit<StudioRecommendedNextActionProps, 'children'>;

type PreviewStory = StoryFn<typeof StudioRecommendedNextAction>;

const ComposedPreviewComponent = (props: PreviewProps) => {
  return (
    <StudioRecommendedNextAction {...props}>
      <p>StudioRecommendedNextAction children will appear here</p>
    </StudioRecommendedNextAction>
  );
};

const meta: Meta<typeof StudioRecommendedNextAction> = {
  title: 'Components/StudioRecommendedNextAction',
  component: StudioRecommendedNextAction,
  args: {
    onSave: fn(),
    onSkip: fn(),
  },
};
export const Preview: PreviewStory = (args): React.ReactElement => (
  <ComposedPreviewComponent {...args} />
);

Preview.args = {
  title: 'Recommended action title',
  description: 'Recommended action description',
  saveButtonText: 'Save',
  skipButtonText: 'Skip',
  hideSaveButton: false,
};

type ExampleUseCase = StoryFn<typeof StudioRecommendedNextAction>;
export const ExampleUseCase: ExampleUseCase = (args): React.ReactElement => {
  const [name, setName] = useState('');
  return (
    <div style={{ width: '500px' }}>
      <StudioRecommendedNextAction
        title='Gi et nytt navn'
        description='Du kan gi denne et nytt navn'
        saveButtonText='Lagre'
        skipButtonText='Hopp over'
        hideSaveButton={name !== 'Bernard'}
        onSave={args.onSave}
        onSkip={args.onSkip}
      >
        <StudioIconTextfield
          error={name !== 'Bernard' ? 'Navnet må være Bernard' : ''}
          onChange={(e) => setName(e.target.value)}
          icon={<KeyVerticalIcon />}
          label='Nytt navn'
        />
      </StudioRecommendedNextAction>
    </div>
  );
};

export default meta;
