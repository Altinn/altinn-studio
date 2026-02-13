import React from 'react';

import { jest } from '@jest/globals';

import { defaultDataTypeMock } from 'src/__mocks__/getUiMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { SummaryRepeatingGroup } from 'src/layout/RepeatingGroup/Summary/SummaryRepeatingGroup';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

type TextResourcesProviderImport = typeof import('src/features/language/textResources/TextResourcesProvider');
jest.mock<TextResourcesProviderImport>('src/features/language/textResources/TextResourcesProvider', () => {
  const actual = jest.requireActual<TextResourcesProviderImport>(
    'src/features/language/textResources/TextResourcesProvider',
  );
  return {
    ...actual,
    useTextResources: jest.fn(() => ({
      mockGroupTitle: { value: 'Mock group' },
      mockField1: { value: 'Mock field 1' },
      mockField2: { value: 'Mock field 2' },
    })),
  };
});

describe('SummaryRepeatingGroup', () => {
  let mockHandleDataChange: () => void;

  beforeEach(() => {
    mockHandleDataChange = jest.fn();
  });

  test('SummaryRepeatingGroup -- should match snapshot', async () => {
    const { asFragment } = await render();
    expect(asFragment()).toMatchSnapshot();
  });

  async function render() {
    const result = await renderWithInstanceAndLayout({
      renderer: (
        <SummaryRepeatingGroup
          changeText='Change'
          onChangeClick={mockHandleDataChange}
          targetBaseComponentId='groupComponent'
        />
      ),
      queries: {
        fetchFormData: async () => ({
          mockGroup: [
            {
              [ALTINN_ROW_ID]: 'abc123',
              mockDataBinding1: '1',
              mockDataBinding2: '2',
            },
          ],
        }),
        fetchLayouts: async () => ({
          FormLayout: {
            data: {
              layout: [
                {
                  type: 'RepeatingGroup',
                  id: 'groupComponent',
                  dataModelBindings: {
                    group: { dataType: defaultDataTypeMock, field: 'mockGroup' },
                  },
                  textResourceBindings: {
                    title: 'mockGroupTitle',
                  },
                  children: ['0:mockId1', '1:mockId2'],
                  edit: {
                    multiPage: true,
                  },
                  maxCount: 3,
                },
                {
                  type: 'Input',
                  id: 'mockId1',
                  dataModelBindings: {
                    simpleBinding: { dataType: defaultDataTypeMock, field: 'mockGroup.mockDataBinding1' },
                  },
                  readOnly: false,
                  required: false,
                  textResourceBindings: {
                    title: 'mockField1',
                  },
                  triggers: [],
                },
                {
                  type: 'Input',
                  id: 'mockId2',
                  dataModelBindings: {
                    simpleBinding: { dataType: defaultDataTypeMock, field: 'mockGroup.mockDataBinding2' },
                  },
                  readOnly: false,
                  required: false,
                  textResourceBindings: {
                    title: 'mockField2',
                  },
                  triggers: [],
                },
                {
                  type: 'Summary',
                  id: 'mySummary',
                  componentRef: 'groupComponent',
                  largeGroup: false,
                },
              ],
            },
          },
        }),
      },
    });

    return result;
  }
});
