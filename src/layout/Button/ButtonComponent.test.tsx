import React from 'react';

import { screen } from '@testing-library/react';

import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { renderGenericComponentTest } from 'src/testUtils';

const submitBtnText = 'Submit form';

describe('ButtonComponent', () => {
  it('should render button when submittingId is falsy', () => {
    render('');

    expect(screen.getByRole('button', { name: submitBtnText })).toBeInTheDocument();
    expect(screen.queryByText('general.loading')).not.toBeInTheDocument();
  });

  it('should render loader when submittingId is truthy', () => {
    render('some-id');

    expect(screen.queryByRole('button')).toBeInTheDocument();
    expect(screen.getByText('general.loading')).toBeInTheDocument();
  });
});

const render = (submittingId: string) => {
  renderGenericComponentTest({
    type: 'Button',
    renderer: (props) => <ButtonComponent {...props} />,
    component: {
      id: 'some-id',
      disabled: false,
    },
    genericProps: {
      text: submitBtnText,
      handleDataChange: jest.fn(),
      language: {},
    },
    manipulateState: (state) => {
      state.formData.submittingId = submittingId;
      state.formLayout.uiConfig.autoSave = true;
    },
  });
};
