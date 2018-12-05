import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';

import { WorkflowStep } from '../../src/containers/WorkflowStep';

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
            ux_editor: {
              formfiller_placeholder_user: 'OLA PRIVATPERSON',
            },
          },
        },
      },
    };
    mockStore = createStore(initialState);
  });

  it('>>> Capture snapshot of WorkflowStep', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <WorkflowStep
          header={mockHeader}
        />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });
});
