import React from 'react';
import { screen } from '@testing-library/react';
import { TemplateSelector, type TemplateSelectorProps } from './TemplateSelector';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import userEvent from '@testing-library/user-event';
import { type ProviderData, renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

describe('TemplateSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render nothing when no templates are provided', () => {
    renderTemplateSelector();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      screen.queryByText(textMock('dashboard.new_application_form.select_templates')),
    ).not.toBeInTheDocument();
  });

  it('should render select with templates', async () => {
    const templates: CustomTemplate[] = [
      {
        id: 'template1',
        name: { nb: 'Template One' },
        description: { nb: 'Description One' },
        owner: 'owner1',
      },
      {
        id: 'template2',
        name: { nb: 'Template Two' },
        description: { nb: 'Description Two' },
        owner: 'owner2',
      },
    ];

    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], templates);

    renderTemplateSelector({}, { queryClient });

    const select = await screen.findByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    expect(select).toBeInTheDocument();
  });

  it('should render correct pre-selected template', async () => {
    const templates: CustomTemplate[] = [
      {
        id: 'template1',
        name: { nb: 'Template One' },
        description: { nb: 'Description One' },
        owner: 'owner1',
      },
      {
        id: 'template2',
        name: { nb: 'Template Two' },
        description: { nb: 'Description Two' },
        owner: 'owner2',
      },
    ];

    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], templates);

    renderTemplateSelector({ selectedTemplate: templates[0] }, { queryClient });

    const select = await screen.findByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    expect(select).toHaveValue('template1');
  });

  it('should handle selection change', async () => {
    const user = userEvent.setup();
    const templates: CustomTemplate[] = [
      {
        id: 'template1',
        name: { nb: 'Template One' },
        description: { nb: 'Description One' },
        owner: 'owner1',
      },
      {
        id: 'template2',
        name: { nb: 'Template Two' },
        description: { nb: 'Description Two' },
        owner: 'owner2',
      },
    ];
    const onChangeMock = jest.fn();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], templates);
    renderTemplateSelector({ onChange: onChangeMock }, { queryClient });

    const select = screen.getByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    await user.selectOptions(select, 'template2');
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(templates[1]);
  });

  it('should handle deselection', async () => {
    const user = userEvent.setup();
    const templates: CustomTemplate[] = [
      {
        id: 'template1',
        name: { nb: 'Template One' },
        description: { nb: 'Description One' },
        owner: 'owner1',
      },
      {
        id: 'template2',
        name: { nb: 'Template Two' },
        description: { nb: 'Description Two' },
        owner: 'owner2',
      },
    ];
    const onChangeMock = jest.fn();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], templates);
    renderTemplateSelector(
      { selectedTemplate: templates[0], onChange: onChangeMock },
      { queryClient },
    );

    const select = screen.getByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    await user.selectOptions(select, '');
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(undefined);
  });

  it('should render nothing if no templates are available', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CustomTemplates, 'testuser'], []);
    renderTemplateSelector({}, { queryClient });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
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
