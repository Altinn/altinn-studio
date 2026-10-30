import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getInstanceAtServiceTaskMock, getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { SubformComponent } from 'src/layout/Subform/SubformComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

interface RenderProps extends Partial<RenderGenericComponentTestProps<'Subform'>> {
  onServiceTaskPage?: boolean;
}

const render = async ({ component, onServiceTaskPage = false }: RenderProps = {}) =>
  await renderGenericComponentTest({
    type: 'Subform',
    renderer: (props) => <SubformComponent {...props} />,
    component: {
      layoutSet: 'subform-layout',
      tableColumns: [],
      textResourceBindings: { title: 'The subform title' },
      ...component,
    },
    queries: { fetchFormData: async () => ({}) },
    apis: {
      instanceApi: {
        getInstance: async () => {
          const instance = onServiceTaskPage ? getInstanceAtServiceTaskMock() : getInstanceWithProcessMock();
          instance.data.push({ ...instance.data[0], id: 'subform-entry', dataType: 'subform-data' });
          return instance;
        },
      },
    },
  });

describe('SubformComponent', () => {
  it('should render the title and a help text button when a help text is set', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'The subform title', help: 'this is the help text' },
      },
    });

    expect(screen.getByText('The subform title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hjelp/i })).toBeInTheDocument();
  });

  it("disables adding, editing and deleting entries on a service task's page", async () => {
    const { mutations } = await render({
      component: { textResourceBindings: { title: 'The subform title', addButton: 'Add entry' } },
      onServiceTaskPage: true,
    });

    const buttons = ['Add entry', 'Endre', 'Slett'].map((name) => screen.getByRole('button', { name }));
    buttons.forEach((button) => expect(button).toBeDisabled());
    for (const button of buttons) {
      await userEvent.click(button);
    }
    expect(mutations.doSubformEntryAdd.mock).not.toHaveBeenCalled();
    expect(mutations.doSubformEntryDelete.mock).not.toHaveBeenCalled();
  });

  it('adds and deletes entries otherwise', async () => {
    const { mutations } = await render({
      component: { textResourceBindings: { title: 'The subform title', addButton: 'Add entry' } },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Slett' }));
    expect(mutations.doSubformEntryDelete.mock).toHaveBeenCalledWith(expect.any(String), 'subform-entry');
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    expect(mutations.doSubformEntryAdd.mock).toHaveBeenCalled();
  });
});
