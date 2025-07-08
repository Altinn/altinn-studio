import React from 'react';

import { screen } from '@testing-library/react';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { type BackendValidationIssue } from 'src/features/validation';
import { SummaryComponent2 } from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompExternal, ILayoutCollection } from 'src/layout/layout';
import type { CompSummary2External } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

describe('SummaryComponent', () => {
  const layoutMock = (
    components: string[] = ['Input', 'Group', 'FileUpload', 'FileUploadWithTag', 'Checkboxes'],
  ): ILayoutCollection => ({
    FormLayout: {
      data: {
        layout: [
          ...components.map(
            (t) =>
              ({
                id: t,
                type: t,
                dataModelBindings:
                  t === 'Input' ? { simpleBinding: { dataType: defaultDataTypeMock, field: 'field' } } : {},
                textResourceBindings: {},
                children: [],
                maxCount: 10,
              }) as CompExternal,
          ),
        ],
      },
    },
  });

  test('should render Group', async () => {
    await render({
      summary2Config: {
        type: 'Summary2',
        id: 'Summary2',
        target: {
          type: 'component',
          id: 'Group',
        },
      },
    });
    expect(screen.getByTestId('summary-group-component')).toBeInTheDocument();
  });

  test('Should render in compact mode when set', async () => {
    await render({
      summary2Config: {
        type: 'Summary2',
        id: 'Summary2',
        isCompact: true,
        hideEmptyFields: false,
      },
    });
    const elements = screen.getAllByTestId('summary-single-value-component');
    expect(elements.length).toBeGreaterThan(0);
    elements.forEach((element) => {
      const labelElement = element.querySelector('.compact');
      expect(labelElement).toBeInTheDocument();
    });
  });

  test('should render component if hideEmptyFields is set to false', async () => {
    await render({
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: false,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });

    expect(screen.getByTestId('summary-single-value-component')).toBeInTheDocument();
  });

  test('should not render component if its set to hide if empty', async () => {
    await render({
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: true,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    const element = screen.queryByTestId('summary-single-value-component');
    expect(element).not.toBeInTheDocument();
  });

  test('should render component if its set to hide if empty, but the field is required', async () => {
    await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'Input',
                type: 'Input',
                dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'field' } },
                required: true,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: true,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    expect(screen.getByTestId('summary-single-value-component')).toBeInTheDocument();
  });

  test('should render component if its set to hide if empty, but the component is set to forceShow', async () => {
    await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'Input',
                type: 'Input',
                dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'field' } },
                forceShowInSummary: true,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: true,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    expect(screen.getByTestId('summary-single-value-component')).toBeInTheDocument();
  });

  test('should hide all empty components if hideEmptyFields=true', async () => {
    await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'Input',
                type: 'Input',
                dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'field' } },
                required: true,
              },
              {
                id: 'Input2',
                type: 'Input',
                dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'field2' } },
                required: true,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: true,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    expect(screen.getByTestId('summary-single-value-component')).toBeInTheDocument();
  });

  test('should hide all empty components if hideEmptyFields=true and the component is not required', async () => {
    await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'Input',
                type: 'Input',
                dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'field' } },
                required: false,
              },
              {
                id: 'Input2',
                type: 'Input',
                dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'field2' } },
                required: false,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        hideEmptyFields: true,
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
      },
    });
    const element = screen.queryByTestId('summary-single-value-component');
    expect(element).not.toBeInTheDocument();
  });

  test('Input: Should render custom empty field text if set in overrides', async () => {
    const emptyFieldText = 'Dette feltet må fylles ut';
    const { container } = await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'Input',
                type: 'Input',
                dataModelBindings: { simpleBinding: { field: 'field', dataType: defaultDataTypeMock } },
                required: false,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        id: 'Summary2',
        target: {
          id: 'Input',
          type: 'component',
        },
        overrides: [
          {
            componentId: 'Input',
            emptyFieldText,
          },
        ],
      },
    });
    expect(container).toHaveTextContent(emptyFieldText);
  });

  test('TextArea: Should render custom empty field text if set in overrides', async () => {
    const emptyFieldText = 'Dette feltet må fylles ut';
    const { container } = await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'TextAreaId',
                type: 'TextArea',
                dataModelBindings: { simpleBinding: { field: 'field', dataType: defaultDataTypeMock } },
                required: false,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        id: 'Summary2',
        target: {
          id: 'TextAreaId',
          type: 'component',
        },
        overrides: [
          {
            componentId: 'TextAreaId',
            emptyFieldText,
          },
        ],
      },
    });
    expect(container).toHaveTextContent(emptyFieldText);
  });

  test('RadioButtons: Should render custom empty field text if set in overrides', async () => {
    const emptyFieldText = 'Dette feltet må fylles ut';
    const { container } = await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'RadioButtonsId',
                type: 'RadioButtons',
                dataModelBindings: { simpleBinding: { field: 'field', dataType: defaultDataTypeMock } },
                required: false,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        id: 'Summary2',
        target: {
          id: 'RadioButtonsId',
          type: 'component',
        },
        overrides: [
          {
            componentId: 'RadioButtonsId',
            emptyFieldText,
          },
        ],
      },
    });
    expect(container).toHaveTextContent(emptyFieldText);
  });

  test('CheckButtons: Should render custom empty field text if set in overrides', async () => {
    const emptyFieldText = 'Dette feltet må fylles ut';
    const { container } = await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'CheckboxesId',
                type: 'Checkboxes',
                dataModelBindings: { simpleBinding: { field: 'field', dataType: defaultDataTypeMock } },
                required: false,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        id: 'Summary2',
        target: {
          id: 'CheckboxesId',
          type: 'component',
        },
        overrides: [
          {
            componentId: 'CheckboxesId',
            emptyFieldText,
          },
        ],
      },
    });
    expect(container).toHaveTextContent(emptyFieldText);
  });

  test('Dropdown: Should render custom empty field text if set in overrides', async () => {
    const emptyFieldText = 'Dette feltet må fylles ut';
    const { container } = await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'DropdownId',
                type: 'Dropdown',
                dataModelBindings: { simpleBinding: { field: 'field', dataType: defaultDataTypeMock } },
                required: false,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        id: 'Summary2',
        target: {
          id: 'DropdownId',
          type: 'component',
        },
        overrides: [
          {
            componentId: 'DropdownId',
            emptyFieldText,
          },
        ],
      },
    });
    expect(container).toHaveTextContent(emptyFieldText);
  });

  test('MultipleSelect: Should render custom empty field text if set in overrides', async () => {
    const emptyFieldText = 'Dette feltet må fylles ut';
    const { container } = await render({
      layout: {
        FormLayout: {
          data: {
            layout: [
              {
                id: 'MultipleSelectPage',
                type: 'MultipleSelect',
                dataModelBindings: {
                  simpleBinding: { field: 'multipleSelect', dataType: defaultDataTypeMock },
                },
                textResourceBindings: {
                  title: 'MultipleSelectPage.MultipleSelect.title',
                },
                options: [
                  {
                    label: 'Kjøre til hytta på fjellet',
                    value: 'kjoreTilHyttaPaaFjellet',
                  },
                  {
                    label: 'Kjøring i skogen',
                    value: 'kjoringISkogen',
                  },
                  {
                    label: 'Korte strekninger med bykjøring, eller annen moro',
                    value: 'korteStrekningerMedBykjoring',
                  },
                  {
                    label: 'Lange strekninger på større veier i Norge',
                    value: 'langeStrekningerPaStorreVeierINorge',
                  },
                ],
                required: false,
              },
            ],
          },
        },
      },
      summary2Config: {
        type: 'Summary2',
        id: 'MultipleSelectPage-Summary',
        target: {
          id: 'MultipleSelectPage',
          type: 'component',
        },
        overrides: [
          {
            componentId: 'MultipleSelectPage',
            emptyFieldText,
          },
        ],
      },
    });
    expect(container).toHaveTextContent(emptyFieldText);
  });

  type IRenderProps = {
    currentPageId?: string;
    layout?: ILayoutCollection;
    validationIssues?: BackendValidationIssue[];
    summary2Config: CompSummary2External;
  };

  const render = async ({
    currentPageId,
    layout = layoutMock(),
    validationIssues = [],
    summary2Config,
  }: IRenderProps) => {
    const layoutPage = layout.FormLayout.data.layout;
    layoutPage?.push({
      type: 'Summary2',
      id: 'mySummary2',
      hideEmptyFields: summary2Config.hideEmptyFields,
      isCompact: summary2Config.isCompact,
      target: summary2Config.target,
      overrides: summary2Config?.overrides ?? [],
    });

    return await renderWithNode<true, LayoutNode<'Summary2'>>({
      nodeId: 'mySummary2',
      inInstance: true,
      renderer: ({ node }) => <SummaryComponent2 baseComponentId={node.baseId} />,
      initialPage: currentPageId,
      queries: {
        fetchLayouts: async () => layout,
        fetchBackendValidations: async () => validationIssues,
      },
    });
  };
});
