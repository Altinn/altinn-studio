/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';

import { WorkflowStep, WorkflowSteps } from '../../src/features/form/containers/WorkflowStep';

describe('>>> containers/WorkflowStep.tsx --- Snapshot', () => {
  let mockHeader: string;
  let mockStore: any;

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
            organization: null,
          },
        },
      },
    };
    mockStore = createStore(initialState);
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <WorkflowStep
          header={mockHeader}
          step={WorkflowSteps.FormFilling}
        />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render formfiller when step is "formfiller"', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <WorkflowStep
          header={mockHeader}
          step={WorkflowSteps.FormFilling}
          children={<div id='mockFormFiller' />}
        />
      </Provider>,
    );
    expect(wrapper.exists('#mockFormFiller')).toEqual(true);
  });

  it('+++ the background color should be blue if step is "FormFiller"', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <WorkflowStep
          header={mockHeader}
          step={WorkflowSteps.FormFilling}
        />
      </Provider>,
    );
    expect(wrapper.find('#workflowContainer').prop('style')).toHaveProperty('backgroundColor', '#1EAEF7');
  });

  it('+++ should render receipt when step is "archived"', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <WorkflowStep
          header={mockHeader}
          step={WorkflowSteps.Archived}
        />
      </Provider>,
    );
    expect(wrapper.exists('#receiptWrapper')).toEqual(true);
  });

  it('+++ the background color should be lightGreen if step is "Archive"', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <WorkflowStep
          header={mockHeader}
          step={WorkflowSteps.Archived}
        />
      </Provider>,
    );
    expect(wrapper.find('#workflowContainer').prop('style')).toHaveProperty('backgroundColor', '#D4F9E4');
  });

  it('+++ should render submit when step is "submit"', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <WorkflowStep
          header={mockHeader}
          step={WorkflowSteps.Submit}
        />
      </Provider>,
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
    };
    mockStore = createStore(newState);
    const wrapper = mount(
      <Provider store={mockStore}>
        <WorkflowStep
          header={mockHeader}
          step={WorkflowSteps.Submit}
        />
      </Provider>,
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
    };
    mockStore = createStore(newState);
    const wrapper = mount(
      <Provider store={mockStore}>
        <WorkflowStep
          header={mockHeader}
          step={WorkflowSteps.Submit}
        />
      </Provider>,
    );
    expect(wrapper.find('.d-block').first().text()).toEqual('');
  });
  it('if organization a different icon should show', () => {
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
            organization: 'Tull og Tøys AS',
          },
        },
      },
    };
    mockStore = createStore(newState);
    const wrapper = mount(
      <Provider store={mockStore}>
        <WorkflowStep
          header={mockHeader}
          step={WorkflowSteps.Submit}
        />
      </Provider>,
    );
    expect(wrapper.find('.d-block').first().text()).toEqual('PÅL REVISOR');
    expect(wrapper.find('.fa-corp-circle-big').length).toBe(1);
  });
});
