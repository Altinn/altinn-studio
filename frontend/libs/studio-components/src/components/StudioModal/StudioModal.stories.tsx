import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioModal, StudioModalProps } from './StudioModal';
import { StudioButton } from '../StudioButton';

type Story = StoryFn<typeof StudioModal>;

const meta: Meta = {
  title: 'Studio/StudioModal',
  component: StudioModal,
};
export const Preview: Story = (args): React.ReactElement => (
  <PreviewComponent {...args}>{args.children}</PreviewComponent>
);

// PreviewComponent is a wrapper component that handles the state of the modal
const PreviewComponent = (args: StudioModalProps): React.ReactElement => {
  const [isOpen, setIsOpen] = React.useState(args.isOpen);
  return (
    <div>
      <StudioButton onClick={() => setIsOpen(true)}>Open modal</StudioButton>
      <StudioModal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        {args.children}
      </StudioModal>
    </div>
  );
};

Preview.args = {
  children: 'Modal content is a ReactNode! Pass a component or a string like in this example.',
  isOpen: false,
  title: 'My modal title',
  closeButtonLabel: 'Close demo modal',
};
export default meta;
