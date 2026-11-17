import React from 'react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { SummaryGroupComponent } from 'src/layout/Group/SummaryGroupComponent';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('SummaryGroupComponent', () => {
  let mockHandleDataChange: () => void;

  beforeEach(() => {
    window.altinnAppGlobalData.textResources!.resources = [
      { id: 'mockGroupTitle', value: 'Mock group' },
      { id: 'mockField1', value: 'Mock field 1' },
      { id: 'mockField2', value: 'Mock field 2' },
    ];
    mockHandleDataChange = vi.fn();
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
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = {
              mockGroup: {
                mockDataBinding1: '1',
                mockDataBinding2: '2',
              },
            };
            obj.layouts = {
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
            };
          }),
      },
    });
  }
});
