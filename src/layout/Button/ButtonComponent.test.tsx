import React from 'react';

import { screen } from '@testing-library/react';

import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { renderGenericComponentTest } from 'src/testUtils';

const submitBtnText = 'Submit form';

describe('ButtonComponent', () => {
  it('should render button when submittingId is falsy', () => {
    render('');

    expect(screen.getByRole('button', { name: submitBtnText })).toBeInTheDocument();
    expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
  });

  it('should render loader when submittingId is truthy', () => {
    render('some-id');

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Laster innhold')).toBeInTheDocument();
  });
});

const render = (submittingId: string) => {
  renderGenericComponentTest({
    type: 'Button',
    renderer: (props) => <ButtonComponent {...props} />,
    component: {
      id: 'some-id',
      textResourceBindings: {
        title: submitBtnText,
      },
    },
    genericProps: {
      handleDataChange: jest.fn(),
    },
    manipulateState: (state) => {
      state.formData.submittingId = submittingId;
    },
  });
};
