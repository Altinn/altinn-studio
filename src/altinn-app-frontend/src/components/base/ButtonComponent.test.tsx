import * as React from 'react';

import { getInitialStateMock } from '__mocks__/mocks';
import { screen } from '@testing-library/react';
import { renderWithProviders } from 'testUtils';

import { ButtonComponent } from 'src/components/base/ButtonComponent';
import type { IButtonProvidedProps } from 'src/components/base/ButtonComponent';

const submitBtnText = 'Submit form';

describe('ButtonComponent', () => {
  it('should render button when isSubmitting is false', () => {
    render({ isSubmitting: false });

    expect(
      screen.getByRole('button', { name: submitBtnText }),
    ).toBeInTheDocument();
    expect(screen.queryByText('general.loading')).not.toBeInTheDocument();
  });

  it('should render loader when isSubmitting is true', () => {
    render({ isSubmitting: true });

    expect(screen.getByText('general.loading')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

const render = ({ isSubmitting }: { isSubmitting: boolean }) => {
  const initialState = getInitialStateMock();
  const preloadedState = {
    ...initialState,
    formData: {
      ...initialState.formData,
      isSubmitting,
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
      text={submitBtnText}
      handleDataChange={jest.fn()}
      disabled={false}
      language={{}}
      {...({} as IButtonProvidedProps)}
    />,
    { preloadedState },
  );
};
