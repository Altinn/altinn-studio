import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormItemContext } from '../../containers/FormItemContext';
import { renderWithProviders } from '../../testing/mocks';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { Dynamics } from './Dynamics';
import { textMock } from '@studio/testing/mocks/i18nMock';
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

  it('should render depreacated old dynamics when enabling switch if ruleHandler is found', async () => {
    (window as WindowWithRuleModel).conditionalRuleHandlerObject = {};
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

  it('should render unknown component alert when component is unknown for Studio', async () => {
    const formType = 'randomUnknownComponent' as unknown as FormComponent;
    await render({ formItem: { ...formItemContextProviderMock.formItem, type: formType } });
    expect(
      screen.getByText(
        textMock('ux_editor.edit_component.unknown_component', {
          componentName: formType,
        }),
      ),
    );
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
