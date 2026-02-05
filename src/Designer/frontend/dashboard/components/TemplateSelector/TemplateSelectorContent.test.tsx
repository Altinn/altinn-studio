import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  TemplateSelectorContent,
  type TemplateSelectorContentProps,
} from './TemplateSelectorContent';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import userEvent from '@testing-library/user-event';

describe('TemplateSelector', () => {
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

    renderTemplateSelectorContent({ availableTemplates: templates });

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

    renderTemplateSelectorContent({
      availableTemplates: templates,
      selectedTemplate: templates[0],
    });

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
    renderTemplateSelectorContent({ availableTemplates: templates, onChange: onChangeMock });

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
    renderTemplateSelectorContent({ selectedTemplate: templates[0], onChange: onChangeMock });

    const select = screen.getByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    await user.selectOptions(select, '');
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(undefined);
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
