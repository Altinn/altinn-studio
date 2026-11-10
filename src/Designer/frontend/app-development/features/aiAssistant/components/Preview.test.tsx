import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ILayoutSettings } from 'app-shared/types/global';
import { renderWithProviders } from '../../../test/mocks';
import { Preview } from './Preview';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';

const previewAvailability = vi.hoisted(() => ({ isPreviewDisabled: false }));
vi.mock('app-shared/utils/previewAvailability', () => ({
  get isPreviewDisabled() {
    return previewAvailability.isPreviewDisabled;
  },
}));

const layoutSetName = 'form-layout-set';
const taskId = 'Task_1';
const layoutName = 'first-page';
const instanceId = 'mock-instance-id';

const defaultLayoutSets: LayoutSets = [{ id: layoutSetName, taskId: taskId }];

const defaultLayoutSettings: ILayoutSettings = {
  pages: { order: [layoutName] },
};

describe('Preview', () => {
  afterEach(() => {
    previewAvailability.isPreviewDisabled = false;
  });

  it('should inform that preview is temporarily disabled instead of loading it', () => {
    previewAvailability.isPreviewDisabled = true;
    const createPreviewInstance = vi.fn();
    renderPreview({
      getLayoutSets: vi.fn().mockResolvedValue(defaultLayoutSets),
      getFormLayoutSettings: vi.fn().mockResolvedValue(defaultLayoutSettings),
      createPreviewInstance,
    });

    expect(screen.getByText(textMock('preview.temporarily_disabled'))).toBeInTheDocument();
    expect(screen.queryByTitle('App Preview')).not.toBeInTheDocument();
    expect(createPreviewInstance).not.toHaveBeenCalled();
  });

  it('should show a loading spinner while data is pending', () => {
    renderPreview();

    expect(screen.getByText('Loading preview...')).toBeInTheDocument();
  });

  it('should show an error message when layout metadata fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const errorMessage = 'Failed to load';

    renderPreview({
      getLayoutSets: vi.fn().mockRejectedValue(new Error(errorMessage)),
    });

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByText('Loading preview...')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('should render an iframe when all data is available', async () => {
    renderPreview({
      getLayoutSets: vi.fn().mockResolvedValue(defaultLayoutSets),
      getFormLayoutSettings: vi.fn().mockResolvedValue(defaultLayoutSettings),
      createPreviewInstance: vi.fn().mockResolvedValue({ id: instanceId }),
    });

    expect(await screen.findByTitle('App Preview')).toBeInTheDocument();
  });

  it('should include layout set and task in the preview URL', async () => {
    renderPreview({
      getLayoutSets: vi.fn().mockResolvedValue(defaultLayoutSets),
      getFormLayoutSettings: vi.fn().mockResolvedValue(defaultLayoutSettings),
      createPreviewInstance: vi.fn().mockResolvedValue({ id: instanceId }),
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
