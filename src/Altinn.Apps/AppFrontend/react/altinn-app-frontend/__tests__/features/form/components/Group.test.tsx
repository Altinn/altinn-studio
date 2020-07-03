/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { Group } from '../../../../src/features/form/containers/Group';
import { getInitialStateMock } from '../../../../__mocks__/mocks';

describe('>>> features/form/components/Group.tsx', () => {
  let mockStore: any;
  let mockLayout: any;
  let mockComponents: any;

  beforeAll(() => {
    window.matchMedia = jest.fn().mockImplementation((query) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      };
    });
  });

  beforeEach(() => {
    const createStore = configureStore();
    mockComponents = [
      {
        id: 'field1',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group.prop1',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
      {
        id: 'field2',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group.prop2',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
      {
        id: 'field3',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group.prop3',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
    ];

    mockLayout = {
      layout: [
        {
          id: 'testGroupId',
          type: 'group',
          dataModelBindings: {
            group: 'Group',
          },
          children: [
            'field1',
            'field2',
            'field3',
          ],
        },
      ].concat(mockComponents),
      uiConfig: {
        hiddenFields: [],
        repeatingGroups: [],
        autosave: false,
      },
    };

    const initialState = getInitialStateMock({ formLayout: mockLayout });
    mockStore = createStore(initialState);
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <Group
          components={mockComponents}
          id='testGroupId'
          dataModelBinding='Group'
          index={0}
          key='testKey'
          repeating={true}
          showAdd={true}
        />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render Add-button when group is repeating', () => {
    const utils = render(
      <Provider store={mockStore}>
        <Group
          components={mockComponents}
          id='testGroupId'
          dataModelBinding='Group'
          index={0}
          key='testKey'
          repeating={true}
          showAdd={true}
        />
      </Provider>,
    );
    expect(utils.findByText('Legg til')).toBeTruthy();
  });

  it('+++ should render Delete-button when specified and group is repeating.', () => {
    const utils = render(
      <Provider store={mockStore}>
        <Group
          components={mockComponents}
          id='testGroupId'
          dataModelBinding='Group'
          index={0}
          key='testKey'
          repeating={true}
          showDelete={true}
        />
      </Provider>,
    );
    expect(utils.findByText('Slett')).toBeTruthy();
  });

  // it('+++ should render formfiller when step is "formfiller"', () => {
  //   const wrapper = mount(
  //     <MemoryRouter>
  //       <Provider store={mockStore}>
  //         <ProcessStep
  //           header={mockHeader}
  //           step={ProcessSteps.FormFilling}p
  //           children={<div id='mockFormFiller' />}
  //         />
  //       </Provider>
  //     </MemoryRouter>,
  //   );
  //   expect(wrapper.exists('#mockFormFiller')).toEqual(true);
  // });

  // it('+++ the background color should be blue if step is "FormFiller"', () => {
  //   const wrapper = mount(
  //     <MemoryRouter>
  //       <Provider store={mockStore}>
  //         <ProcessStep
  //           header={mockHeader}
  //           step={ProcessSteps.FormFilling}
  //         />
  //       </Provider>
  //     </MemoryRouter>,
  //   );

  //   expect(
  //     wrapper
  //     .find('AltinnAppHeader').prop('headerBackgroundColor'))
  //     .toBe(AltinnAppTheme.altinnPalette.primary.blue);

  // });

  // it('+++ the background color should be lightGreen if step is "Archive"', () => {
  //   const wrapper = mount(
  //     <MemoryRouter>
  //       <Provider store={mockStore}>
  //         <ProcessStep
  //           header={mockHeader}
  //           step={ProcessSteps.Archived}
  //         />
  //       </Provider>
  //     </MemoryRouter>,
  //   );

  //   expect(
  //     wrapper
  //     .find('AltinnAppHeader').prop('headerBackgroundColor'))
  //     .toBe(AltinnAppTheme.altinnPalette.primary.greenLight);

  // });

  // it('+++ should map validations if there are any and create error report', () => {
  //   const createStore = configureStore();
  //   const newState = {
  //     language: {
  //       language: {
  //         form_filler: {
  //           error_report_header: 'Mock error report',
  //           placeholder_user: 'OLA PRIVATPERSON',
  //         },
  //       },
  //     },
  //     textResources: {
  //       resources: null
  //     },
  //     formValidations: {
  //       validations: {
  //         unmapped: {
  //           'mock-component-id': {
  //             errors: ['mock-error-message', 'another-mock-error-message'],
  //           },
  //         },
  //       },
  //     },
  //     profile: {
  //       profile: null,
  //     },
  //     organisationMetaData: {
  //       allOrgs: null,
  //     },
  //     applicationMetadata: {
  //       applicationMetadata: null,
  //     },
  //     instanceData: {
  //       instance: null,
  //     },
  //     formData: {
  //       hasSubmitted: false,
  //     },
  //   };
  //   mockStore = createStore(newState);
  //   const wrapper = mount(
  //     <MemoryRouter>
  //       <Provider store={mockStore}>
  //         <ProcessStep
  //           header={mockHeader}
  //           step={ProcessSteps.FormFilling}
  //         />
  //       </Provider>
  //     </MemoryRouter>,
  //   );
  //   expect(wrapper.exists('#errorReport')).toBe(true);
  // });

  // it('+++ should hide error report when there are no validation errors', () => {
  //   const createStore = configureStore();
  //   const newState = {
  //     language: {
  //       language: {
  //         form_filler: {
  //           error_report_header: 'Mock error report',
  //           placeholder_user: 'OLA PRIVATPERSON',
  //         },
  //       },
  //     },
  //     textResources: {
  //       resources: null
  //     },
  //     formValidations: {
  //       validations: {},
  //     },
  //     profile: {
  //       profile: null,
  //     },
  //     organisationMetaData: {
  //       allOrgs: null,
  //     },
  //     applicationMetadata: {
  //       applicationMetadata: null,
  //     },
  //     instanceData: {
  //       instance: null,
  //     },
  //     formData: {
  //       hasSubmitted: false,
  //     },
  //   };
  //   mockStore = createStore(newState);
  //   const wrapper = mount(
  //     <MemoryRouter>
  //       <Provider store={mockStore}>
  //         <ProcessStep
  //           header={mockHeader}
  //           step={ProcessSteps.FormFilling}
  //         />
  //       </Provider>
  //     </MemoryRouter>,
  //   );
  //   expect(wrapper.exists('#errorReport')).toBe(false);
  // });
});
