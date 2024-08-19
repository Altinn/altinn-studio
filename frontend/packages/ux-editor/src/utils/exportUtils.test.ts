import { generateExportFormFormat } from './exportUtils';
import type { IFormLayouts } from '../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ITextResources } from 'app-shared/types/global';
import type { ExportForm } from '../types/ExportForm';

describe('generateExportFormFormat', () => {
  const settings = {
    pages: {
      order: ['page1'],
    },
  };
  const formLayouts: IFormLayouts = {
    page1: {
      components: {
        component1: {
          id: 'component1',
          itemType: 'COMPONENT',
          type: ComponentType.Input,
          dataModelBindings: { simpleBinding: 'simpleBinding' },
          textResourceBindings: {
            title: 'title1',
          },
        },
        component2: {
          id: 'component2',
          itemType: 'COMPONENT',
          type: ComponentType.RadioButtons,
          dataModelBindings: { simpleBinding: 'simpleBinding' },
          textResourceBindings: {
            title: 'title2',
          },
          optionsId: 'optionList1',
        },
      },
      containers: {
        __base__: {
          id: '__base__',
          index: 0,
          itemType: 'CONTAINER',
          type: null,
          pageIndex: null,
        },
      },
      order: {
        __base__: ['component1', 'component2'],
      },
      customDataProperties: {},
      customRootProperties: {},
    },
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
  const optionLists = {
    optionList1: [{ label: 'option1', value: 'option1' }],
  };
  it.each(['nb', 'en'])(
    'should generate correct export format for specified text resource language',
    (language) => {
      const result = generateExportFormFormat(
        settings.pages.order,
        formLayouts,
        selectedFormLayoutSetName,
        app,
        textResources,
        optionLists,
        language,
        false,
      );

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
                dataModelBindings: { simpleBinding: 'simpleBinding' },
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
                dataModelBindings: { simpleBinding: 'simpleBinding' },
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
});
