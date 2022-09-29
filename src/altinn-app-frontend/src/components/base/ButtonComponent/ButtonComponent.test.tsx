import * as React from 'react';

import { getInitialStateMock } from '__mocks__/mocks';
import { screen } from '@testing-library/react';
import { renderWithProviders } from 'testUtils';

import { ButtonComponent } from 'src/components/base/ButtonComponent/ButtonComponent';
import type { IButtonProvidedProps } from 'src/components/base/ButtonComponent/ButtonComponent';

const submitBtnText = 'Submit form';

describe('ButtonComponent', () => {
  it('should render button when submittingId is falsy', () => {
    render({ submittingId: '' });

    expect(
      screen.getByRole('button', { name: submitBtnText }),
    ).toBeInTheDocument();
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
      id={'some-id'}
      text={submitBtnText}
      handleDataChange={jest.fn()}
      disabled={false}
      language={{}}
      {...({} as IButtonProvidedProps)}
    />,
    { preloadedState },
  );
};
