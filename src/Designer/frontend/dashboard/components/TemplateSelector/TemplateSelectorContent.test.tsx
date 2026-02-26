import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  TemplateSelectorContent,
  type TemplateSelectorContentProps,
} from './TemplateSelectorContent';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import userEvent from '@testing-library/user-event';

describe('TemplateSelectorContent', () => {
  const defaultTemplates: CustomTemplate[] = [
    {
      id: 'template1',
      name: 'Template One',
      description: 'Description One',
      owner: 'owner1',
    },
    {
      id: 'template2',
      name: 'Template Two',
      description: 'Description Two',
      owner: 'owner2',
    },
  ];
  it('should render select with templates', async () => {
    renderTemplateSelectorContent({ availableTemplates: defaultTemplates });

    const select = await screen.findByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    expect(select).toBeInTheDocument();
  });

  it('should render correct pre-selected template', async () => {
    renderTemplateSelectorContent({
      availableTemplates: defaultTemplates,
      selectedTemplate: defaultTemplates[0],
    });

    const select = await screen.findByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    expect(select).toHaveValue('template1');
  });

  it('should handle selection change', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();
    renderTemplateSelectorContent({ availableTemplates: defaultTemplates, onChange: onChangeMock });

    const select = screen.getByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    await user.selectOptions(select, 'template2');
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(defaultTemplates[1]);
  });

  it('should handle deselection', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();
    renderTemplateSelectorContent({
      availableTemplates: defaultTemplates,
      selectedTemplate: defaultTemplates[0],
      onChange: onChangeMock,
    });

    const select = screen.getByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    await user.selectOptions(select, '');
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(undefined);
  });

  it('should render template details when a template is selected', () => {
    const templates: CustomTemplate[] = [
      {
        id: 'template1',
        name: 'Template One',
        description: 'Description One',
        owner: 'owner1',
      },
    ];

    renderTemplateSelectorContent({
      availableTemplates: templates,
      selectedTemplate: templates[0],
    });

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

    renderTemplateSelectorContent({ availableTemplates: templates });

    expect(screen.queryByRole('heading', { name: 'Template One' })).not.toBeInTheDocument();
    expect(screen.queryByText('Description One')).not.toBeInTheDocument();
  });

  it('should render template name even if description is missing', () => {
    const templates: CustomTemplate[] = [
      {
        id: 'template1',
        name: 'Template One',
        description: undefined,
        owner: 'owner1',
      },
    ];

    renderTemplateSelectorContent({
      availableTemplates: templates,
      selectedTemplate: templates[0],
    });

    expect(screen.getByRole('heading', { name: 'Template One' })).toBeInTheDocument();
    expect(screen.queryByText('Description One')).not.toBeInTheDocument();
  });

  it('should render template id if name is missing', () => {
    const templates: CustomTemplate[] = [
      {
        id: 'template1',
        name: undefined,
        description: 'Description One',
        owner: 'owner1',
      },
    ];

    renderTemplateSelectorContent({
      availableTemplates: templates,
      selectedTemplate: templates[0],
    });

    expect(screen.getByRole('heading', { name: 'template1' })).toBeInTheDocument();
    expect(screen.getByText('Description One')).toBeInTheDocument();
  });
});

function renderTemplateSelectorContent(props?: Partial<TemplateSelectorContentProps>) {
  const defaultProps: TemplateSelectorContentProps = {
    selectedTemplate: undefined,
    onChange: jest.fn(),
    availableTemplates: [],
  };
  return render(<TemplateSelectorContent {...defaultProps} {...props} />);
}
