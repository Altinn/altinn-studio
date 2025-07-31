import { ExportUtils } from './exportUtils';
import type { IFormLayouts } from '../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ITextResources } from 'app-shared/types/global';
import type { ExportForm } from '../types/ExportForm';
import type { FormComponent } from '../types/FormComponent';
import type { FormContainer } from '../types/FormContainer';
import type { OptionListData } from 'app-shared/types/OptionList';

describe('generateExportFormFormat', () => {
  const settings = {
    pages: {
      order: ['page1'],
    },
  };
  const component1: FormComponent<ComponentType.Input> = {
    id: 'component1',
    itemType: 'COMPONENT',
    type: ComponentType.Input,
    dataModelBindings: { simpleBinding: { field: 'simpleBinding', dataType: '' } },
    textResourceBindings: {
      title: 'title1',
    },
    required: true,
    readOnly: false,
  };

  const component2: FormComponent<ComponentType.RadioButtons> = {
    id: 'component2',
    itemType: 'COMPONENT',
    type: ComponentType.RadioButtons,
    dataModelBindings: { simpleBinding: { field: 'simpleBinding', dataType: '' } },
    textResourceBindings: {
      title: 'title2',
    },
    optionsId: 'optionList1',
    mapping: {
      test: 'test',
    },
  };

  const baseContainerMock: FormContainer = {
    id: '__base__',
    index: 0,
    itemType: 'CONTAINER',
    type: null,
    pageIndex: null,
  };

  const generateMockInternalFormLayouts = (
    components: FormComponent[],
    containers: FormContainer[] = [baseContainerMock],
  ): IFormLayouts => {
    return {
      page1: {
        components: components.reduce(
          (acc, component) => ({ ...acc, [component.id]: component }),
          {},
        ),
        containers: containers.reduce(
          (acc, container) => ({ ...acc, [container.id]: container }),
          {},
        ),
        order: {
          __base__: components.map((component) => component.id),
        },
        customDataProperties: {},
        customRootProperties: {},
      },
    };
  };

  const selectedFormLayoutSetName = 'layout1';
  const app = 'app1';
  const textResources: ITextResources = {
    nb: [
      {
        id: 'title1',
        value: 'NB_Title 1',
      },
      {
        id: 'title2',
        value: 'NB_Title 2',
      },
      {
        id: 'option1',
        value: 'NB_Option 1',
      },
    ],
    en: [
      {
        id: 'title1',
        value: 'EN_Title 1',
      },
      {
        id: 'title2',
        value: 'EN_Title 2',
      },
      {
        id: 'option1',
        value: 'EN_Option 1',
      },
    ],
  };
  const optionListsData: OptionListData[] = [
    { title: 'optionList1', data: [{ label: 'option1', value: 'option1' }] },
  ];

  it.each(['nb', 'en'])(
    'should generate correct export format for specified default language',
    (language) => {
      const generator = new ExportUtils(
        settings.pages.order,
        generateMockInternalFormLayouts([component1, component2]),
        selectedFormLayoutSetName,
        app,
        textResources,
        optionListsData,
        language,
        false,
      );

      const result = generator.generateExportFormFormat();

      const expectedExportForm: ExportForm = {
        appId: app,
        formId: selectedFormLayoutSetName,
        pages: [
          {
            pageId: 'page1',
            sortOrder: 0,
            components: [
              {
                id: 'component1',
                type: ComponentType.Input,
                dataModelBindings: { simpleBinding: { field: 'simpleBinding', dataType: '' } },
                texts: [
                  {
                    id: 'title1',
                    type: 'title',
                    text: [
                      {
                        language,
                        value: textResources[language].find(
                          (textResource) => textResource.id === 'title1',
                        )?.value,
                      },
                    ],
                  },
                ],
                sortOrder: 0,
                options: undefined,
              },
              {
                id: 'component2',
                type: ComponentType.RadioButtons,
                dataModelBindings: { simpleBinding: { field: 'simpleBinding', dataType: '' } },
                texts: [
                  {
                    id: 'title2',
                    type: 'title',
                    text: [
                      {
                        language,
                        value: textResources[language].find(
                          (textResource) => textResource.id === 'title2',
                        )?.value,
                      },
                    ],
                  },
                ],
                options: [
                  {
                    value: 'option1',
                    label: [
                      {
                        language,
                        value: textResources[language].find(
                          (textResource) => textResource.id === 'option1',
                        )?.value,
                      },
                    ],
                  },
                ],
                sortOrder: 1,
              },
            ],
          },
        ],
      };

      expect(result).toEqual(expectedExportForm);
    },
  );

  it('should generate correct export format for all languages if no default language is specified', () => {
    const generator = new ExportUtils(
      settings.pages.order,
      generateMockInternalFormLayouts([component1]),
      selectedFormLayoutSetName,
      app,
      textResources,
      optionListsData,
      undefined,
      false,
    );

    const result = generator.generateExportFormFormat();

    const expectedExportForm: ExportForm = {
      appId: app,
      formId: selectedFormLayoutSetName,
      pages: [
        {
          pageId: 'page1',
          sortOrder: 0,
          components: [
            expect.objectContaining({
              texts: [
                {
                  id: 'title1',
                  type: 'title',
                  text: [
                    {
                      language: 'nb',
                      value: textResources['nb'].find(
                        (textResource) => textResource.id === 'title1',
                      )?.value,
                    },
                    {
                      language: 'en',
                      value: textResources['en'].find(
                        (textResource) => textResource.id === 'title1',
                      )?.value,
                    },
                  ],
                },
              ],
            }),
          ],
        },
      ],
    };

    expect(result).toEqual(expectedExportForm);
  });

  it('should only include default properties when includeRestProperties is false', () => {
    const generator = new ExportUtils(
      settings.pages.order,
      generateMockInternalFormLayouts([component1, component2]),
      selectedFormLayoutSetName,
      app,
      textResources,
      optionListsData,
      'nb',
      false,
    );

    const result = generator.generateExportFormFormat();

    expect(result.pages[0].components[0]).not.toHaveProperty('required');
    expect(result.pages[0].components[0]).not.toHaveProperty('readOnly');
    expect(result.pages[0].components[1]).not.toHaveProperty('mapping');
  });

  it('should include all properties when includeRestProperties is true', () => {
    const generator = new ExportUtils(
      settings.pages.order,
      generateMockInternalFormLayouts([component1, component2]),
      selectedFormLayoutSetName,
      app,
      textResources,
      optionListsData,
      'nb',
      true,
    );

    const result = generator.generateExportFormFormat();

    expect(result.pages[0].components[0]).toHaveProperty('required');
    expect(result.pages[0].components[0]).toHaveProperty('readOnly');
    expect(result.pages[0].components[1]).toHaveProperty('mapping');
  });

  it('should return empty array for text resource binding if no text resource bindings are set for component', () => {
    const componentWithoutTextResourceBindings: FormComponent<ComponentType.Input> = {
      id: 'component1',
      itemType: 'COMPONENT',
      type: ComponentType.Input,
      dataModelBindings: { simpleBinding: { field: 'simpleBinding', dataType: '' } },
      textResourceBindings: {},
      required: true,
      readOnly: false,
    };
    const generator = new ExportUtils(
      settings.pages.order,
      generateMockInternalFormLayouts([componentWithoutTextResourceBindings]),
      selectedFormLayoutSetName,
      app,
      textResources,
      optionListsData,
      'nb',
      true,
    );

    const result = generator.generateExportFormFormat();

    expect(result.pages[0].components[0].texts).toEqual([]);
  });
});
