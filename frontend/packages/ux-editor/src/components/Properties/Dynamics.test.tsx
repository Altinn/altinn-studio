import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormContext } from '../../containers/FormContext';
import { renderWithMockStore } from '../../testing/mocks';
import { formContextProviderMock } from '../../testing/formContextMocks';
import { Dynamics } from './Dynamics';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { WindowWithRuleModel } from '../../hooks/queries/useRuleModelQuery';
import type { FormComponent } from '../../types/FormComponent';

const user = userEvent.setup();

// Test data:
const conditionalRenderingTestId = 'conditional-rendering';
const expressionsTestId = 'expressions';

// Mocks:
jest.mock('./ConditionalRendering', () => ({
  ConditionalRendering: () => <div data-testid={conditionalRenderingTestId} />,
}));
jest.mock('../config/Expressions', () => ({
  Expressions: () => <div data-testid={expressionsTestId} />,
}));

describe('Dynamics', () => {
  afterEach(jest.clearAllMocks);

  it('should render new expressions editor by default', async () => {
    await render();
    expect(screen.getByTestId(expressionsTestId)).toBeInTheDocument();
    expect(screen.queryByTestId(conditionalRenderingTestId)).not.toBeInTheDocument();
  });

  it('should not render switch if ruleHandler is not found', async () => {
    await render();
    const oldDynamicsSwitch = screen.queryByRole('checkbox', {
      name: textMock('right_menu.show_old_dynamics'),
    });
    expect(oldDynamicsSwitch).not.toBeInTheDocument();
  });

  it('should render default unchecked switch if ruleHandler is found', async () => {
    (window as WindowWithRuleModel).conditionalRuleHandlerObject = {};
    await render();
    const oldDynamicsSwitch = screen.getByRole('checkbox', {
      name: textMock('right_menu.show_old_dynamics'),
    });
    expect(oldDynamicsSwitch).toBeInTheDocument();
    expect(oldDynamicsSwitch).not.toBeChecked();
  });

  it('should render old dynamics when enabling switch if ruleHandler is found', async () => {
    (window as WindowWithRuleModel).conditionalRuleHandlerObject = {};
    await render();
    const oldDynamicsSwitch = screen.getByRole('checkbox', {
      name: textMock('right_menu.show_old_dynamics'),
    });
    await act(() => user.click(oldDynamicsSwitch));
    expect(screen.queryByTestId(expressionsTestId)).not.toBeInTheDocument();
    expect(screen.getByTestId(conditionalRenderingTestId)).toBeInTheDocument();
  });

  it('should render unknown component alert when component is unknown for Studio', async () => {
    const formType = 'randomUnknownComponent' as unknown as FormComponent;
    await render({ form: { ...formContextProviderMock.form, type: formType } });
    expect(
      screen.getByText(
        textMock('ux_editor.edit_component.unknown_component', {
          componentName: formType,
        }),
      ),
    );
  });
});

const render = async (props: Partial<FormContext> = {}) => {
  return renderWithMockStore({})(
    <FormContext.Provider
      value={{
        ...formContextProviderMock,
        ...props,
      }}
    >
      <Dynamics />
    </FormContext.Provider>,
  );
};
