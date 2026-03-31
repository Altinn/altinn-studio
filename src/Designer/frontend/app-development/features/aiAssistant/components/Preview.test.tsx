import { screen } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ILayoutSettings } from 'app-shared/types/global';
import { renderWithProviders } from '../../../test/mocks';
import { Preview } from './Preview';
import { app, org } from '@studio/testing/testids';

const layoutSetName = 'form-layout-set';
const taskId = 'Task_1';
const layoutName = 'first-page';
const instanceId = 'mock-instance-id';

const defaultLayoutSets: LayoutSets = {
  sets: [{ id: layoutSetName, tasks: [taskId] }],
};

const defaultLayoutSettings: ILayoutSettings = {
  pages: { order: [layoutName] },
};

describe('Preview', () => {
  it('should show a loading spinner while data is pending', () => {
    renderPreview();

    expect(screen.getByText('Loading preview...')).toBeInTheDocument();
  });

  it('should show an error message when layout metadata fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const errorMessage = 'Failed to load';

    renderPreview({
      getLayoutSets: jest.fn().mockRejectedValue(new Error(errorMessage)),
    });

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByText('Loading preview...')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('should render an iframe when all data is available', async () => {
    renderPreview({
      getLayoutSets: jest.fn().mockResolvedValue(defaultLayoutSets),
      getFormLayoutSettings: jest.fn().mockResolvedValue(defaultLayoutSettings),
      createPreviewInstance: jest.fn().mockResolvedValue({ id: instanceId }),
    });

    expect(await screen.findByTitle('App Preview')).toBeInTheDocument();
  });

  it('should include layout set and task in the preview URL', async () => {
    renderPreview({
      getLayoutSets: jest.fn().mockResolvedValue(defaultLayoutSets),
      getFormLayoutSettings: jest.fn().mockResolvedValue(defaultLayoutSettings),
      createPreviewInstance: jest.fn().mockResolvedValue({ id: instanceId }),
    });

    const iframe = await screen.findByTitle('App Preview');
    const src = iframe.getAttribute('src');
    expect(src).toContain(org);
    expect(src).toContain(app);
    expect(src).toContain(layoutSetName);
    expect(src).toContain(taskId);
    expect(src).toContain(layoutName);
  });
});

const renderPreview = (queries: Partial<ServicesContextProps> = {}) => {
  renderWithProviders(queries)(<Preview />);
};
