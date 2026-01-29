import React from 'react';
import { screen } from '@testing-library/react';
import { TemplateSelector, type TemplateSelectorProps } from './TemplateSelector';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import userEvent from '@testing-library/user-event';
import { useAvailableTemplatesForOrgQuery } from '../../hooks/queries/useAvailableTemplatesForOrgQuery';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { type ProviderData, renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

jest.mock('../../hooks/queries/useAvailableTemplatesForOrgQuery');

(useAvailableTemplatesForOrgQuery as jest.Mock).mockReturnValue({
  data: [],
});

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

  it('should render select with templates', () => {
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
    (useAvailableTemplatesForOrgQuery as jest.Mock).mockReturnValue({
      data: templates,
    });
    renderTemplateSelector();

    const select = screen.getByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    expect(select).toBeInTheDocument();
  });

  it('should render correct pre-selected template', () => {
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
    (useAvailableTemplatesForOrgQuery as jest.Mock).mockReturnValue({
      data: templates,
    });
    renderTemplateSelector({ selectedTemplate: templates[0] });

    const select = screen.getByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    }) as HTMLSelectElement;
    expect(select.value).toBe('template1');
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
    (useAvailableTemplatesForOrgQuery as jest.Mock).mockReturnValue({
      data: templates,
    });
    renderTemplateSelector({ onChange: onChangeMock });

    const select = screen.getByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    await user.selectOptions(select, 'template2');
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
    (useAvailableTemplatesForOrgQuery as jest.Mock).mockReturnValue({
      data: templates,
    });
    renderTemplateSelector({ selectedTemplate: templates[0], onChange: onChangeMock });

    const select = screen.getByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    await user.selectOptions(select, '');
    expect(onChangeMock).toHaveBeenCalledWith(undefined);
  });

  it('should render nothing if no templates are available', () => {
    (useAvailableTemplatesForOrgQuery as jest.Mock).mockReturnValue({
      data: [],
    });
    renderTemplateSelector();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

function renderTemplateSelector(
  props?: Partial<TemplateSelectorProps>,
  services?: Partial<ServicesContextProps>,
  providerData: ProviderData = {},
) {
  const defaultProps: TemplateSelectorProps = {
    selectedTemplate: null,
    onChange: jest.fn(),
  };

  const defaultProviderData: ProviderData = {
    queries: services,
    queryClient: createQueryClientMock(),
    featureFlags: [],
  };
  return renderWithProviders(<TemplateSelector {...defaultProps} {...props} />, {
    ...defaultProviderData,
    ...providerData,
  });
}
