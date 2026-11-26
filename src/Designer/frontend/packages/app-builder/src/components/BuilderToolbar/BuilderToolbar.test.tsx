import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('opens the preview without generating the model or checking whether it is out of date', async () => {
    const user = userEvent.setup();
    const generateModels = vi.fn();
    const getDataModelGenerationStatus = vi.fn();
    renderBuilderToolbar({ generateModels, getDataModelGenerationStatus });

    await user.click(getTestAppButton());

    expect(assign).toHaveBeenCalledWith(expect.stringContaining('?layout=side1'));
    expect(generateModels).not.toHaveBeenCalled();
    expect(getDataModelGenerationStatus).not.toHaveBeenCalled();
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
