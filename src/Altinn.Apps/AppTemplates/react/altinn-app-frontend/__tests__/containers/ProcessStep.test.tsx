
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import ProcessStep from '../../src/shared/containers/ProcessStep';
import { ProcessSteps } from '../../src/types';
import {AltinnAppTheme} from 'altinn-shared/theme';

describe('>>> containers/ProcessStep.tsx', () => {
  let mockHeader: string;
  let mockStore: any;

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
    mockHeader = 'mock-service-name';
    const createStore = configureStore();
    const initialState = {
      language: {
        language: {
          form_filler: {
            error_report_header: 'Mock error report',
          },
        },
      },
      textResources: {
        resources: null
      },
      formValidations: {
        validations: {
          'mock-component-id': {
            simpleBinding: {
              errors: ['mock-error-message'],
              warnings: ['mock-warning-message'],
            },
          },
        },
      },
      profile: {
        error: null,
        profile: {
          party: {
            person: {
              firstName: 'Ola',
              middleName: null,
              lastName: 'Privatperson',
            },
            organisation: null,
          },
        },
      },
      organisationMetaData: {
        allOrgs: null,
      },
      applicationMetadata: {
        applicationMetadata: null,
      },
      instanceData: {
        instance: {
          instanceOwner: {
            partyId: '12345',
          }
        },
      },
      party: {
        parties: [
          {
            partyId: '12345',
            name: 'Ola Privatperson',
            ssn: '01017512345',
          }
        ],
      },
      formData: {
        hasSubmitted: false,
      },
    };
    mockStore = createStore(initialState);
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <MemoryRouter>
        <Provider store={mockStore}>
          <ProcessStep
            header={mockHeader}
            step={ProcessSteps.FormFilling}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render formfiller when step is "formfiller"', () => {
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <ProcessStep
            header={mockHeader}
            step={ProcessSteps.FormFilling}
            children={<div id='mockFormFiller' />}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.exists('#mockFormFiller')).toEqual(true);
  });

  it('+++ the background color should be blue if step is "FormFiller"', () => {
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <ProcessStep
            header={mockHeader}
            step={ProcessSteps.FormFilling}
          />
        </Provider>
      </MemoryRouter>,
    );

    expect(
      wrapper
      .find('AltinnAppHeader').prop('headerBackgroundColor'))
      .toBe(AltinnAppTheme.altinnPalette.primary.blue);

  });

  it('+++ the background color should be lightGreen if step is "Archive"', () => {
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <ProcessStep
            header={mockHeader}
            step={ProcessSteps.Archived}
          />
        </Provider>
      </MemoryRouter>,
    );

    expect(
      wrapper
      .find('AltinnAppHeader').prop('headerBackgroundColor'))
      .toBe(AltinnAppTheme.altinnPalette.primary.greenLight);

  });

  it('+++ should map validations if there are any and create error report', () => {
    const createStore = configureStore();
    const newState = {
      language: {
        language: {
          form_filler: {
            error_report_header: 'Mock error report',
            placeholder_user: 'OLA PRIVATPERSON',
          },
        },
      },
      textResources: {
        resources: null
      },
      formValidations: {
        validations: {
          unmapped: {
            'mock-component-id': {
              errors: ['mock-error-message', 'another-mock-error-message'],
            },
          },
        },
      },
      profile: {
        profile: null,
      },
      organisationMetaData: {
        allOrgs: null,
      },
      applicationMetadata: {
        applicationMetadata: null,
      },
      instanceData: {
        instance: null,
      },
      formData: {
        hasSubmitted: false,
      },
    };
    mockStore = createStore(newState);
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <ProcessStep
            header={mockHeader}
            step={ProcessSteps.FormFilling}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.exists('#errorReport')).toBe(true);
  });

  it('+++ should hide error report when there are no validation errors', () => {
    const createStore = configureStore();
    const newState = {
      language: {
        language: {
          form_filler: {
            error_report_header: 'Mock error report',
            placeholder_user: 'OLA PRIVATPERSON',
          },
        },
      },
      textResources: {
        resources: null
      },
      formValidations: {
        validations: {},
      },
      profile: {
        profile: null,
      },
      organisationMetaData: {
        allOrgs: null,
      },
      applicationMetadata: {
        applicationMetadata: null,
      },
      instanceData: {
        instance: null,
      },
      formData: {
        hasSubmitted: false,
      },
    };
    mockStore = createStore(newState);
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <ProcessStep
            header={mockHeader}
            step={ProcessSteps.FormFilling}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.exists('#errorReport')).toBe(false);
  });
});
