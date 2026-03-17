import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StudioRecommendedNextAction } from './index';
import { StudioIconTextfield } from '../StudioIconTextfield';
import { KeyVerticalIcon } from '../../../../studio-icons/src';

const ChildrenComponent = (): React.ReactElement => (
  <p>StudioRecommendedNextAction children will appear here</p>
);

const meta = {
  title: 'Components/StudioRecommendedNextAction',
  component: StudioRecommendedNextAction,
  args: {
    onSave: fn(),
    onSkip: fn(),
  },
} satisfies Meta<typeof StudioRecommendedNextAction>;
export default meta;

type Story = StoryObj<typeof StudioRecommendedNextAction>;

export const Preview: Story = {
  args: {
    title: 'Recommended action title',
    description: 'Recommended action description',
    saveButtonText: 'Save',
    skipButtonText: 'Skip',
    hideSaveButton: false,
    children: <ChildrenComponent />,
  },
};

export const ExampleUseCase: Story = {
  render: (args): React.ReactElement => {
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
  },
};
