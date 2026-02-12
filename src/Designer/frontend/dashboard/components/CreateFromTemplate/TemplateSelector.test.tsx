import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { TemplateSelector, type TemplateSelectorProps } from './TemplateSelector';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import userEvent from '@testing-library/user-event';
import type { Organization } from 'app-shared/types/Organization';

describe('TemplateSelector', () => {
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

  it('should render all provided templates as options in the select', async () => {
    renderTemplateSelectorContent({ availableTemplates: defaultTemplates });

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(3); // 2 templates + 1 default option
    expect(options[0]).toHaveTextContent(
      textMock('dashboard.new_application_form.select_templates_default'),
    );
    expect(options[1]).toHaveTextContent('Template One');
    expect(options[2]).toHaveTextContent('Template Two');
  });

  it('should group templates by owner', async () => {
    const templates: CustomTemplate[] = [
      { id: 'template1', name: 'Template One', description: 'Description One', owner: 'owner1' },
      { id: 'template2', name: 'Template Two', description: 'Description Two', owner: 'owner1' },
      {
        id: 'template3',
        name: 'Template Three',
        description: 'Description Three',
        owner: 'owner2',
      },
    ];

    const organizations: Organization[] = [
      { id: 1, full_name: 'Organization One', username: 'owner1', avatar_url: '' },
      { id: 2, full_name: 'Organization Two', username: 'owner2', avatar_url: '' },
    ];
    renderTemplateSelectorContent({ availableTemplates: templates, organizations });

    const optgroups = await screen.findAllByRole('group');
    expect(optgroups).toHaveLength(2);
    expect(within(optgroups[0]).getAllByRole('option')).toHaveLength(2); // 2 templates for owner1
    expect(within(optgroups[1]).getAllByRole('option')).toHaveLength(1); // 1 template for owner2
    expect(optgroups[0]).toHaveAttribute('label', 'Organization One');
    expect(optgroups[1]).toHaveAttribute('label', 'Organization Two');
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
});

function renderTemplateSelectorContent(props?: Partial<TemplateSelectorProps>) {
  const defaultProps: TemplateSelectorProps = {
    selectedTemplate: undefined,
    onChange: jest.fn(),
    availableTemplates: [],
    organizations: [],
  };
  return render(<TemplateSelector {...defaultProps} {...props} />);
}
