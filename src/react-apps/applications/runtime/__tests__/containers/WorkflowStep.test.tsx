import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';

import { WorkflowStep, WorkflowSteps } from '../../src/containers/WorkflowStep';

describe('>>> containers/WorkflowStep.tsx --- Snapshot', () => {
  let mockHeader: string;
  let mockStore: any;

  beforeEach(() => {
    mockHeader = 'mock-service-name';
    const createStore = configureStore();
    const initialState = {
      appData: {
        language: {
          language: {
            form_filler: {
              error_report_header: 'Mock error report',
              placeholder_user: 'OLA PRIVATPERSON',
            },
          },
        },
      },
      formFiller: {
        validationResults: {
          'mock-component-id': {
            simpleBinding: {
              errors: ['mock-error-message'],
              warnings: ['mock-warning-message'],
            },
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
          onStepChange={null}
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
          onStepChange={null}
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
          onStepChange={null}
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
          onStepChange={null}
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
          onStepChange={null}
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
          onStepChange={null}
        />
      </Provider>,
    );
    expect(wrapper.exists('#workflowSubmitStepButton')).toEqual(true);
  });

});
