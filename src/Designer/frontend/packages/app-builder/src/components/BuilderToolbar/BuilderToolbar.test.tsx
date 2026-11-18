import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { AppBuilderProvider } from '../../contexts/AppBuilderContext';
import type { AppBuilderData } from '../../contexts/AppBuilderContext';
import { BuilderToolbar } from './BuilderToolbar';
import type { BuilderToolbarProps } from './BuilderToolbar';

const org = 'org';
const app = 'app';
const dataModel = { dataType: 'model', modelPath: 'App/models/model.schema.json', schema: {} };

const data: AppBuilderData = {
  org,
  app,
  layoutSetName: 'form',
  layoutSetNames: ['form'],
  layouts: {},
  contentPageNames: [],
  texts: {},
  dataModel,
};

const defaultProps: BuilderToolbarProps = {
  org,
  app,
  view: 'pages',
  onViewChange: vi.fn(),
  layoutSets: [{ id: 'form' }],
  layoutSetName: 'form',
  onLayoutSetChange: vi.fn(),
  pageName: 'side1',
};

const getTestAppButton = (): HTMLElement =>
  screen.getByRole('button', { name: textMock('app_builder.test_app') });

describe('BuilderToolbar', () => {
  const assign = vi.fn();
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, assign },
    writable: true,
  });
  afterEach(() => assign.mockReset());

  it('generates the model before the app is tested when the model is out of date', async () => {
    const user = userEvent.setup();
    const generateModels = vi.fn().mockImplementation(() => Promise.resolve());
    renderBuilderToolbar({
      generateModels,
      getDataModelGenerationStatus: () => Promise.resolve(true),
    });

    expect(await screen.findByText(textMock('app_builder.model.out_of_date'))).toBeInTheDocument();
    await user.click(getTestAppButton());

    expect(generateModels).toHaveBeenCalledWith(org, app, dataModel.modelPath, dataModel.schema);
    await waitFor(() => expect(assign).toHaveBeenCalled());
  });

  it('opens the app without generating the model when it is up to date', async () => {
    const user = userEvent.setup();
    const generateModels = vi.fn();
    renderBuilderToolbar({
      generateModels,
      getDataModelGenerationStatus: () => Promise.resolve(false),
    });

    await user.click(getTestAppButton());

    expect(generateModels).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalled();
    expect(screen.queryByText(textMock('app_builder.model.out_of_date'))).not.toBeInTheDocument();
  });

  it('does not open the app when the model cannot be generated', async () => {
    const user = userEvent.setup();
    const generateModels = vi.fn().mockImplementation(() => Promise.reject(new Error('failed')));
    renderBuilderToolbar({
      generateModels,
      getDataModelGenerationStatus: () => Promise.resolve(true),
    });

    await screen.findByText(textMock('app_builder.model.out_of_date'));
    await user.click(getTestAppButton());

    await waitFor(() => expect(generateModels).toHaveBeenCalled());
    expect(assign).not.toHaveBeenCalled();
  });
});

function renderBuilderToolbar(services: Partial<ServicesContextProps>) {
  return render(
    <ServicesContextProvider {...queriesMock} {...services} client={createQueryClientMock()}>
      <AppBuilderProvider {...data}>
        <BuilderToolbar {...defaultProps} />
      </AppBuilderProvider>
    </ServicesContextProvider>,
  );
}
