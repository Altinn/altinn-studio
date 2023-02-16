import React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { renderWithProviders } from 'src/testUtils';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

const submitBtnText = 'Submit form';

describe('ButtonComponent', () => {
  it('should render button when submittingId is falsy', () => {
    render({ submittingId: '' });

    expect(screen.getByRole('button', { name: submitBtnText })).toBeInTheDocument();
    expect(screen.queryByText('general.loading')).not.toBeInTheDocument();
  });

  it('should render loader when submittingId is truthy', () => {
    render({ submittingId: 'some-id' });

    expect(screen.queryByRole('button')).toBeInTheDocument();
    expect(screen.getByText('general.loading')).toBeInTheDocument();
  });
});

const render = ({ submittingId }: { submittingId: string }) => {
  const initialState = getInitialStateMock();
  const preloadedState = {
    ...initialState,
    formData: {
      ...initialState.formData,
      submittingId,
    },
    formLayout: {
      ...initialState.formLayout,
      uiConfig: {
        ...initialState.formLayout.uiConfig,
        autoSave: true,
      },
    },
  };

  renderWithProviders(
    <ButtonComponent
      {...({} as IButtonProvidedProps)}
      id={'some-id'}
      text={submitBtnText}
      handleDataChange={jest.fn()}
      disabled={false}
      language={{}}
    />,
    { preloadedState },
  );
};
