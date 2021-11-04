
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { AltinnAppTheme } from 'altinn-shared/theme';
import Presentation from '../../src/shared/containers/Presentation';
import { ProcessTaskType, IRuntimeState } from '../../src/types';
import { getInitialStateMock } from '../../__mocks__/mocks';

describe('>>> containers/Presentation.tsx', () => {
  let mockHeader: string;
  let mockStore: any;
  let mockInitialState: IRuntimeState;

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
    mockInitialState = getInitialStateMock({
      formValidations: {
        validations: {
          FormLayout: {
            'mock-component-id': {
              simpleBinding: {
                errors: ['mock-error-message'],
                warnings: ['mock-warning-message'],
              },
            },
          },
        },
        invalidDataTypes: null,
        error: null,
        currentSingleFieldValidation: null,
      },
    });
    mockStore = createStore(mockInitialState);
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <MemoryRouter>
        <Provider store={mockStore}>
          <Presentation
            header={mockHeader}
            type={ProcessTaskType.Data}
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
          <Presentation
            header={mockHeader}
            type={ProcessTaskType.Data}
          >
            <div id='mockFormFiller' />
          </Presentation>
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.exists('#mockFormFiller')).toEqual(true);
  });

  it('+++ the background color should be greyLight if step is "data"', () => {
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <Presentation
            header={mockHeader}
            type={ProcessTaskType.Data}
          />
        </Provider>
      </MemoryRouter>,
    );

    expect(
      wrapper
        .find('AltinnAppHeader').prop('headerBackgroundColor'),
    ).toBe(AltinnAppTheme.altinnPalette.primary.greyLight);
  });

  it('+++ the background color should be lightGreen if step is "Archive"', () => {
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <Presentation
            header={mockHeader}
            type={ProcessTaskType.Archived}
          />
        </Provider>
      </MemoryRouter>,
    );

    expect(
      wrapper.find('AltinnAppHeader').prop('headerBackgroundColor'),
    ).toBe(AltinnAppTheme.altinnPalette.primary.greenLight);
  });

  it('+++ should map validations if there are any and create error report', () => {
    const createStore = configureStore();
    const newState = getInitialStateMock({
      language: {
        language: {
          form_filler: {
            error_report_header: 'Mock error report',
            placeholder_user: 'OLA PRIVATPERSON',
          },
        },
        error: null,
      },
      formValidations: {
        validations: {
          FormLayout: {
            unmapped: {
              'mock-component-id': {
                errors: ['mock-error-message', 'another-mock-error-message'],
              },
            },
          },
        },
        invalidDataTypes: null,
        error: null,
        currentSingleFieldValidation: null,
      },
    });
    mockStore = createStore(newState);
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <Presentation
            header={mockHeader}
            type={ProcessTaskType.Data}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.exists('#errorReport')).toBe(true);
  });

  it('+++ should hide error report when there are no validation errors', () => {
    const createStore = configureStore();
    const newState = getInitialStateMock();
    mockStore = createStore(newState);
    const wrapper = mount(
      <MemoryRouter>
        <Provider store={mockStore}>
          <Presentation
            header={mockHeader}
            type={ProcessTaskType.Data}
          />
        </Provider>
      </MemoryRouter>,
    );
    expect(wrapper.exists('#errorReport')).toBe(false);
  });
});
