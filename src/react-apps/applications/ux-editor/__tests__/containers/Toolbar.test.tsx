/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { Toolbar } from '../../src/containers/Toolbar';

describe('>>> containers/Toolbar', () => {
  let mockLanguage: any;
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
    mockLanguage = {
      general: {
        label: '',
        value: '',
      },
      ux_editor: {
        component_advanced_address: 'Adresse',
        component_button: 'Knapp',
        component_checkbox: 'Avkrysningsboks',
        component_container: 'Container',
        component_datepicker: 'Dato',
        component_dropdown: 'Nedtrekksliste',
        component_file_upload: 'Vedlegg',
        component_header: 'Tittel',
        component_input: 'Kort svar',
        component_paragraph: 'Paragraf',
        component_radio_button: 'Radioknapp',
        component_text_area: 'Langt svar',
      },
    };
    const initialState = {
      appData: {
        codeLists: {
          codeLists: [] as any,
          error: null as any,
          fetched: true,
          fetching: false,
        },
        language: {
          language: mockLanguage,
        },
        dataModel: {
          model: [] as any[],
        },
        textResources: {
          resources: [{ id: 'ServiceName', value: 'Test' }],
        },
      },
      formDesigner: {
        layout: {
          activeList: {},
          activeContainer: '',
        },
      },
      serviceConfigurations: {
        APIs: {
          connections: null as any,
        },
      },
      thirdPartyComponents: {
        components: null as any,
        error: null as any,
      },
    };
    mockStore = createStore(initialState);
  });
  it('>>> Capture snapshot of Toolbar', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <Toolbar />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('+++ should contain schemaComponents', () => {
    const mountedToolbar = mount(
      <Provider store={mockStore}>
        <Toolbar />
      </Provider>,
    );
    expect(mountedToolbar.exists('#schema-components')).toEqual(true);
  });
});
