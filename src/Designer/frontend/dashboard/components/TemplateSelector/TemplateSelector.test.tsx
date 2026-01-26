import React from 'react';
import { render, screen } from '@testing-library/react';
import { TemplateSelector, type TemplateSelectorProps } from './TemplateSelector';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import userEvent from '@testing-library/user-event';

describe('TemplateSelector', () => {
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
    renderTemplateSelector({ templates });

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
    renderTemplateSelector({ templates, selectedTemplate: templates[0] });

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
    renderTemplateSelector({ templates, onChange: onChangeMock });

    const select = screen.getByRole('combobox', {
      name: textMock('dashboard.new_application_form.select_templates'),
    });
    await user.selectOptions(select, 'template2');
    expect(onChangeMock).toHaveBeenCalledWith(templates[1]);
  });
});

const renderTemplateSelector = (props: Partial<TemplateSelectorProps> = {}) => {
  const defaultProps: TemplateSelectorProps = {
    templates: [],
    selectedTemplate: null,
    onChange: jest.fn(),
  };
  render(<TemplateSelector {...defaultProps} {...props} />);
};
