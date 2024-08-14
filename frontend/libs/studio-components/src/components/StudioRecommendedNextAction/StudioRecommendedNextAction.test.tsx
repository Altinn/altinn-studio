import { render, screen } from '@testing-library/react';
import { StudioRecommendedNextAction } from './StudioRecommendedNextAction';
import React from 'react';
import userEvent from '@testing-library/user-event';

describe('StudioRecommendedNextAction', () => {
  const onSave = jest.fn();
  const onSkip = jest.fn();

  it('renders correctly', () => {
    render(
      <StudioRecommendedNextAction
        onSave={onSave}
        saveButtonText='Save'
        onSkip={onSkip}
        skipButtonText='Skip'
        title='Title'
        description='Description'
      >
        <p>Child</p>
      </StudioRecommendedNextAction>,
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <StudioRecommendedNextAction
        onSave={onSave}
        saveButtonText='Save'
        onSkip={onSkip}
        skipButtonText='Skip'
        title='Title'
        description='Description'
      >
        <p>Child</p>
      </StudioRecommendedNextAction>,
    );

    await user.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when skip button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <StudioRecommendedNextAction
        onSave={onSave}
        saveButtonText='Save'
        onSkip={onSkip}
        skipButtonText='Skip'
        title='Title'
        description='Description'
      >
        <p>Child</p>
      </StudioRecommendedNextAction>,
    );

    await user.click(screen.getByText('Skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not render save button when hideSaveButton is true', () => {
    render(
      <StudioRecommendedNextAction
        onSave={onSave}
        saveButtonText='Save'
        onSkip={onSkip}
        skipButtonText='Skip'
        title='Title'
        description='Description'
        hideSaveButton
      >
        <p>Child</p>
      </StudioRecommendedNextAction>,
    );

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });
});
