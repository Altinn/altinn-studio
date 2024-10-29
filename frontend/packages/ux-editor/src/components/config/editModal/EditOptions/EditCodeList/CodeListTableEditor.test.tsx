import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../../../../types/FormComponent';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { CodeListTableEditor } from './CodeListTableEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PreviewContext, type PreviewContextProps } from 'app-development/contexts/PreviewContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent, { UserEvent } from '@testing-library/user-event';

// Test data:
const mockComponent: FormComponent<ComponentType.Dropdown> = {
  id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
  type: ComponentType.Dropdown,
  itemType: 'COMPONENT',
  dataModelBindings: { simpleBinding: 'some-path' },
  optionsId: 'test',
};

const defaultPreviewContextProps: PreviewContextProps = {
  shouldReloadPreview: false,
  doReloadPreview: jest.fn(),
  previewHasLoaded: jest.fn(),
};

const queryClientMock = createQueryClientMock();
describe('CodeListTableEditor', () => {
  afterEach(() => {
    queryClientMock.clear();
  });

  it('should render the component', async () => {
    await renderCodeListTableEditor();

    expect(
      await screen.findByRole('button', {
        name: textMock('ux_editor.modal_properties_code_list_open_editor'),
      }),
    ).toBeInTheDocument();
  });

  it('should open Dialog', async () => {
    const user = userEvent.setup();
    await renderCodeListTableEditor();
    await userFindOpenButtonAndClick(user);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should close Dialog', async () => {
    const user = userEvent.setup();
    const doReloadPreview = jest.fn();
    await renderCodeListTableEditor({ previewContextProps: { doReloadPreview } });
    await userFindOpenButtonAndClick(user);

    await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when https://github.com/digdir/designsystemet/issues/2195 is fixed

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(doReloadPreview).toHaveBeenCalledTimes(1); // Todo: assertion fails, needs to take a closer look why handleClose does not get called.
  });
});

const userFindOpenButtonAndClick = async (user: UserEvent) => {
  const btnOpen = await screen.findByRole('button', {
    name: textMock('ux_editor.modal_properties_code_list_open_editor'),
  });
  await user.click(btnOpen);
};

const renderCodeListTableEditor = async ({
  queries = {},
  previewContextProps = {},
  componentProps = {},
} = {}) => {
  const allQueries: ServicesContextProps = {
    ...queries,
    ...queriesMock,
  };

  return render(
    <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
      <PreviewContext.Provider value={{ ...defaultPreviewContextProps, ...previewContextProps }}>
        <CodeListTableEditor
          component={{
            ...mockComponent,
            ...componentProps,
          }}
        />
      </PreviewContext.Provider>
    </ServicesContextProvider>,
  );
};
