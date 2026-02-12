import React from 'react';
import { screen } from '@testing-library/react';
import { CreateFromTemplate, type CreateFromTemplateProps } from './CreateFromTemplate';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { type ProviderData, renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { CustomTemplate } from 'app-shared/types/CustomTemplate';

describe('CreateFromTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render nothing when available templates is undefined', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], undefined);
    renderCreateFromTemplate({}, { queryClient });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      screen.queryByText(textMock('dashboard.new_application_form.select_templates')),
    ).not.toBeInTheDocument();
  });

  it('should render nothing if no templates are available', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], []);
    renderCreateFromTemplate({}, { queryClient });
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
    renderCreateFromTemplate({}, { queryClient });
    expect(
      await screen.findByText(textMock('dashboard.new_application_form.select_templates')),
    ).toBeInTheDocument();
  });

  it('should render template details when a template is selected', async () => {
    const templates: CustomTemplate[] = [
      {
        id: 'template1',
        name: 'Template One',
        description: 'Description One',
        owner: 'owner1',
      },
    ];

    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], templates);
    renderCreateFromTemplate({ selectedTemplate: templates[0] }, { queryClient });
    expect(screen.getByRole('heading', { name: 'Template One' })).toBeInTheDocument();
    expect(screen.getByText('Description One')).toBeInTheDocument();
  });

  it('should not render template details when no template is selected', () => {
    const templates: CustomTemplate[] = [
      {
        id: 'template1',
        name: 'Template One',
        description: 'Description One',
        owner: 'owner1',
      },
    ];

    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], templates);
    renderCreateFromTemplate({}, { queryClient });

    expect(screen.queryByRole('heading', { name: 'Template One' })).not.toBeInTheDocument();
    expect(screen.queryByText('Description One')).not.toBeInTheDocument();
  });

  it('should render error message when error prop is provided', () => {
    const templates: CustomTemplate[] = [
      {
        id: 'template1',
        name: 'Template One',
        description: 'Description One',
        owner: 'owner1',
      },
    ];

    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], templates);
    renderCreateFromTemplate({ error: 'Error applying template' }, { queryClient });

    expect(
      screen.getByText(textMock('dashboard.new_application_form.template_error.heading')),
    ).toBeInTheDocument();
    expect(screen.getByText('Error applying template')).toBeInTheDocument();
  });
});

function renderCreateFromTemplate(
  props?: Partial<CreateFromTemplateProps>,
  providerData: ProviderData = {},
) {
  const defaultProps: CreateFromTemplateProps = {
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
  return renderWithProviders(<CreateFromTemplate {...defaultProps} {...props} />, {
    ...defaultProviderData,
    ...providerData,
  });
}
