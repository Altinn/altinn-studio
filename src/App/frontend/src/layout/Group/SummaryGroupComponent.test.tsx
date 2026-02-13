import React from 'react';

import { jest } from '@jest/globals';

import { defaultDataTypeMock } from 'src/__mocks__/getUiMock';
import { SummaryGroupComponent } from 'src/layout/Group/SummaryGroupComponent';
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

describe('SummaryGroupComponent', () => {
  let mockHandleDataChange: () => void;

  beforeEach(() => {
    mockHandleDataChange = jest.fn();
  });

  test('SummaryGroupComponent -- should match snapshot', async () => {
    const { asFragment } = await render();
    expect(asFragment()).toMatchSnapshot();
  });

  async function render() {
    return await renderWithInstanceAndLayout({
      renderer: (
        <SummaryGroupComponent
          changeText='Change'
          onChangeClick={mockHandleDataChange}
          targetBaseComponentId='groupComponent'
        />
      ),
      queries: {
        fetchFormData: async () => ({
          mockGroup: {
            mockDataBinding1: '1',
            mockDataBinding2: '2',
          },
        }),
        fetchLayouts: async () => ({
          FormLayout: {
            data: {
              layout: [
                {
                  type: 'Group',
                  id: 'groupComponent',
                  textResourceBindings: {
                    title: 'mockGroupTitle',
                  },
                  children: ['mockId1', 'mockId2'],
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
  }
});
