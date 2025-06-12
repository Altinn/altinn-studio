import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormItemContext } from '../../containers/FormItemContext';
import { renderWithProviders } from '../../testing/mocks';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { Dynamics } from './Dynamics';
import { textMock } from '@studio/testing/mocks/i18nMock';

const user = userEvent.setup();

// Test data:
const expressionsTestId = 'expressions';

// Mocks:
jest.mock('../config/Expressions', () => ({
  Expressions: () => <div data-testid={expressionsTestId} />,
}));

describe('Dynamics', () => {
  afterEach(jest.clearAllMocks);

  it('should render new expressions editor by default', async () => {
    await render();
    expect(screen.getByTestId(expressionsTestId)).toBeInTheDocument();
  });

  it('should render default unchecked switch', async () => {
    await render();
    const oldDynamicsSwitch = screen.getByRole('checkbox', {
      name: textMock('right_menu.show_old_dynamics'),
    });
    expect(oldDynamicsSwitch).toBeInTheDocument();
    expect(oldDynamicsSwitch).not.toBeChecked();
  });

  it('should render depreacated old dynamics when enabling switch', async () => {
    await render();
    const oldDynamicsSwitch = screen.getByRole('checkbox', {
      name: textMock('right_menu.show_old_dynamics'),
    });
    await user.click(oldDynamicsSwitch);
    expect(screen.queryByTestId(expressionsTestId)).not.toBeInTheDocument();
    expect(
      screen.getByText(textMock('right_menu.rules_conditional_rendering_deprecated_info_title')),
    ).toBeInTheDocument();
  });
});

const render = async (props: Partial<FormItemContext> = {}) => {
  return renderWithProviders(
    <FormItemContext.Provider
      value={{
        ...formItemContextProviderMock,
        ...props,
      }}
    >
      <Dynamics />
    </FormItemContext.Provider>,
  );
};
