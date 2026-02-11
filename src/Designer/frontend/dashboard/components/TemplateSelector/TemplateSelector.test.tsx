import React from 'react';
import { screen } from '@testing-library/react';
import { TemplateSelector, type TemplateSelectorProps } from './TemplateSelector';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { type ProviderData, renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

describe('TemplateSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render nothing when available templates is undefined', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], undefined);
    renderTemplateSelector({}, { queryClient });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      screen.queryByText(textMock('dashboard.new_application_form.select_templates')),
    ).not.toBeInTheDocument();
  });

  it('should render nothing if no templates are available', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], []);
    renderTemplateSelector({}, { queryClient });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should render TemplateSelectorContent when templates are available', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData(
      [QueryKey.CustomTemplates, 'testuser'],
      [
        {
          id: 'template1',
          name: 'Template One',
          description: 'Description One',
          owner: 'owner1',
        },
      ],
    );
    renderTemplateSelector({}, { queryClient });
    expect(
      await screen.findByText(textMock('dashboard.new_application_form.select_templates')),
    ).toBeInTheDocument();
  });
});

function renderTemplateSelector(
  props?: Partial<TemplateSelectorProps>,
  providerData: ProviderData = {},
) {
  const defaultProps: TemplateSelectorProps = {
    selectedTemplate: null,
    onChange: jest.fn(),
    username: 'testuser',
    organizations: [],
  };

  const defaultProviderData: ProviderData = {
    queries: {},
    queryClient: createQueryClientMock(),
    featureFlags: [],
  };
  return renderWithProviders(<TemplateSelector {...defaultProps} {...props} />, {
    ...defaultProviderData,
    ...providerData,
  });
}
