/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';

import { WorkflowStep, WorkflowSteps } from '../../src/features/form/containers/WorkflowStep';

describe('>>> containers/WorkflowStep.tsx --- Snapshot', () => {
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
        instance: null,
      },
    };
    mockStore = createStore(initialState);
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <MemoryRouter>
        <Provider store={mockStore}>
          <WorkflowStep
            header={mockHeader}
            step={WorkflowSteps.FormFilling}
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
          <WorkflowStep
            header={mockHeader}
            step={WorkflowSteps.FormFilling}
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
          <WorkflowStep
            header={mockHeader}
            step={WorkflowSteps.FormFilling}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.find('#workflowContainer').prop('style')).toHaveProperty('backgroundColor', '#1EAEF7');
  });

  it('+++ should render receipt when step is "archived"', () => {
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <WorkflowStep
            header={mockHeader}
            step={WorkflowSteps.Archived}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.exists('#ReceiptContainer')).toEqual(true);
  });

  it('+++ the background color should be lightGreen if step is "Archive"', () => {
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <WorkflowStep
            header={mockHeader}
            step={WorkflowSteps.Archived}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.find('#workflowContainer').prop('style')).toHaveProperty('backgroundColor', '#D4F9E4');
  });

  it('+++ should render submit when step is "submit"', () => {
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <WorkflowStep
            header={mockHeader}
            step={WorkflowSteps.Submit}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.exists('#workflowSubmitStepButton')).toEqual(true);
  });
  it('+++ should map unmappedValidations if there are any and create error report', () => {
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
    };
    mockStore = createStore(newState);
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <WorkflowStep
            header={mockHeader}
            step={WorkflowSteps.Submit}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.find('.a-modal-header').first().prop('style')).toHaveProperty('backgroundColor', '#F9CAD3');
  });

  it('no user in state returns null', () => {
    const createStore = configureStore();
    const newState = {
      language: {
        language: {
          form_filler: {
            error_report_header: 'Mock error report',
          },
        },
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
    };
    mockStore = createStore(newState);
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <WorkflowStep
            header={mockHeader}
            step={WorkflowSteps.Submit}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.find('.d-block').first().text()).toEqual('');
  });

  it('if organisation a different icon should show', () => {
    const createStore = configureStore();
    const newState = {
      language: {
        language: {
          form_filler: {
            error_report_header: 'Mock error report',
          },
        },
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
              firstName: 'Pål',
              middleName: null,
              lastName: 'Revisor',
            },
            organisation: {
              name: 'Tull og Tøys AS',
            },
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
        instance: null,
      },
    };
    mockStore = createStore(newState);
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <WorkflowStep
            header={mockHeader}
            step={WorkflowSteps.Submit}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.find('.d-block').first().text()).toEqual('PÅL REVISOR');
    expect(wrapper.find('.fa-corp-circle-big').length).toBe(1);
  });
});
