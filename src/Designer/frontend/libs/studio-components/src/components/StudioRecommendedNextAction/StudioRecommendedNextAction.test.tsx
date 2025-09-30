import { fireEvent, render, screen } from '@testing-library/react';
import { StudioRecommendedNextAction } from './StudioRecommendedNextAction';
import React from 'react';
import userEvent from '@testing-library/user-event';

describe('StudioRecommendedNextAction', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });
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

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
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

    fireEvent.submit(screen.getByRole('button', { name: 'Save' }));
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

    await user.click(screen.getByRole('button', { name: 'Skip' }));
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
