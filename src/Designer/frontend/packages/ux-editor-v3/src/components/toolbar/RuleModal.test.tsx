import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../testing/mocks';
import { layoutSet1NameMock } from '../../testing/layoutSetsMock';
import type { IFormLayouts } from '../../types/global';
import { layout1NameMock, layoutMock } from '../../testing/layoutMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import ruleHandlerMock, { rule1Name, rule2Name } from '../../testing/ruleHandlerMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { RuleModal } from './RuleModal';

describe('ruleModal', () => {
  it('should render without crashing', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: textMock('right_menu.rules_calculations_add_alt') }),
    ).toBeInTheDocument();
  });

  it('should allow adding a new rule', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(
      screen.getByRole('button', { name: textMock('right_menu.rules_calculations_add_alt') }),
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('ux_editor.modal_configure_rules_helper') }),
      rule2Name,
    );
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));
    expect(screen.getByRole('button', { name: rule2Name })).toBeInTheDocument();
  });

  it('should not save if canceling a new rule', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(
      screen.getByRole('button', { name: textMock('right_menu.rules_calculations_add_alt') }),
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('ux_editor.modal_configure_rules_helper') }),
      rule2Name,
    );
    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));
    expect(screen.queryByRole('button', { name: rule2Name })).not.toBeInTheDocument();
  });

  it('should allow deleting an existing rule', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(
      screen.getByRole('button', { name: textMock('right_menu.rules_calculations_add_alt') }),
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('ux_editor.modal_configure_rules_helper') }),
      rule2Name,
    );
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));
    expect(screen.getByRole('button', { name: rule2Name })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: rule2Name }));
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(screen.queryByRole('button', { name: rule2Name })).not.toBeInTheDocument();
  });

  it('should allow editing an existing rule', async () => {
    const user = userEvent.setup();
    const { queries } = renderComponent();
    await user.click(
      screen.getByRole('button', { name: textMock('right_menu.rules_calculations_add_alt') }),
    );
    await user.selectOptions(
      screen.getByLabelText(textMock('ux_editor.modal_configure_rules_helper')),
      rule2Name,
    );
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));

    const rule2Button = await screen.findByRole('button', { name: rule2Name });
    expect(rule2Button).toBeInTheDocument();

    await user.click(rule2Button);
    await user.selectOptions(
      screen.getByLabelText(textMock('ux_editor.modal_configure_rules_helper')),
      rule1Name,
    );
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));

    expect(queries.saveRuleConfig).toHaveBeenCalled();
  });
});

const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};
const renderComponent = () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  queryClient.setQueryData([QueryKey.RuleConfig, org, app, layoutSetName], {
    data: {
      ruleConnection: {},
      conditionalRendering: {},
    },
  });
  const queries = {
    getRuleModel: jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock)),
    getRuleConfig: jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: {
          ruleConnection: {},
          conditionalRendering: {},
        },
      }),
    ),
    saveRuleConfig: jest.fn().mockImplementation(() => Promise.resolve()),
  };
  return { ...renderWithProviders(<RuleModal />, { queries, queryClient }), queries };
};
