import React from 'react';
import { ConditionalRendering } from './ConditionalRendering';
import { screen } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../testing/mocks';
import { layoutSet1NameMock } from '../../testing/layoutSetsMock';
import ruleHandlerMock, { condition3Name } from '../../testing/ruleHandlerMock';
import {
  app,
  conditionalRenderingDeleteButtonId,
  conditionalRenderingOutputFieldId,
  org,
} from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';

import type { IFormLayouts } from '../../types/global';
import { layout1NameMock, layoutMock } from '../../testing/layoutMock';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('ConditionalRendering', () => {
  it('should render without crashing', () => {
    renderComponent();
    screen.getByRole('button', {
      name: textMock('right_menu.rules_conditional_rendering_add_alt'),
    });
  });

  it('should allow configuring and saving a new condition', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(
      screen.getByRole('button', {
        name: textMock('right_menu.rules_conditional_rendering_add_alt'),
      }),
    );

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.modal_configure_conditional_rendering_helper'),
      }),
      condition3Name,
    );
    await user.selectOptions(
      screen.getByRole('combobox', {
        name: textMock(
          'ux_editor.modal_configure_conditional_rendering_configure_output_action_helper',
        ),
      }),
      'Show',
    );
    await user.selectOptions(
      screen.getByRole('combobox', {
        name: textMock(
          'ux_editor.modal_configure_conditional_rendering_configure_output_action_helper',
        ),
      }),
      'Show',
    );
    await user.selectOptions(
      screen.getByTestId(conditionalRenderingOutputFieldId),
      screen.getByRole('option', { name: /.input\)\] \(component\-1\)/i }),
    );

    await user.click(screen.getByRole('button', { name: textMock('general.save') }));

    expect(screen.getByRole('button', { name: condition3Name })).toBeInTheDocument();
  });

  it('should allow deleting a condition', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(
      screen.getByRole('button', {
        name: textMock('right_menu.rules_conditional_rendering_add_alt'),
      }),
    );

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.modal_configure_conditional_rendering_helper'),
      }),
      condition3Name,
    );

    await user.click(screen.getByRole('button', { name: textMock('general.save') }));
    await user.click(screen.getByRole('button', { name: condition3Name }));
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(screen.queryByRole('button', { name: condition3Name })).not.toBeInTheDocument();
  });

  it('should allow adding and removing multiple components to a condition', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(
      screen.getByRole('button', {
        name: textMock('right_menu.rules_conditional_rendering_add_alt'),
      }),
    );

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.modal_configure_conditional_rendering_helper'),
      }),
      condition3Name,
    );

    await user.click(
      screen.getByRole('button', {
        name: textMock(
          'ux_editor.modal_configure_conditional_rendering_configure_add_new_field_mapping',
        ),
      }),
    );
    expect(screen.getAllByTestId(conditionalRenderingOutputFieldId)).toHaveLength(2);
    await user.click(screen.getAllByTestId(conditionalRenderingDeleteButtonId)[0]);
    expect(screen.getAllByTestId(conditionalRenderingOutputFieldId)).toHaveLength(1);
  });

  it('should allow closing the modal without saving', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(
      screen.getByRole('button', {
        name: textMock('right_menu.rules_conditional_rendering_add_alt'),
      }),
    );
    await user.selectOptions(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.modal_configure_conditional_rendering_helper'),
      }),
      condition3Name,
    );
    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));
    expect(screen.queryByRole('button', { name: condition3Name })).not.toBeInTheDocument();
  });
});

const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};
const renderComponent = () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  const queries = {
    getRuleModel: jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock)),
  };
  return renderWithProviders(<ConditionalRendering />, { queries, queryClient });
};
