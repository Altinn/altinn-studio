import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import { mount } from 'enzyme';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
// eslint-disable-next-line import/no-named-as-default
import ServiceCard from '../../../features/serviceOverview/serviceCard';
import ErrorPopover from '../../../../shared/components/ErrorPopover';
import AltinnSpinner from '../../../../shared/components/AltinnSpinner';
import { IRepository } from '../../../../shared/types';

describe('>>> features/serviceCard', () => {
  let mockStore: MockStoreEnhanced<unknown, {}>;
  let mockService: IRepository;
  beforeAll(() => {
    const createStore = configureStore();
    const initialState = {
      language: {
        language: {
          dashboard: {
            last_changed_service: 'Sist endret',
            open_repository: 'Åpne repository',
            open_new_tab: 'Åpne ny fane',
            make_copy: 'Lag kopi',
            field_cannot_be_empty: 'Navnet kan ikke være tomt',
            service_name_has_illegal_characters: 'Ugyldige karakterer',
            service_name_is_too_long: 'For langt navn',
            unknown_error_copy: 'Ukjent feil',
          },
          general: {
            cancel: 'Avbryt',
          },
        },
      },
    };
    mockStore = createStore(initialState);
    mockService = {
      owner: {
        full_name: 'Test Testesen',
        avatar_url: '',
      },
      is_cloned_to_local: true,
      full_name: 'test/test-app',
      name: 'test-app',
      updated_at: '',
      description: 'Min test app',

    } as IRepository;
  });

  it('+++ should display menu with option to go to repo, designer and clone app', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <ServiceCard service={mockService} />
      </Provider>,
    );
    wrapper.find('#ellipsis-button').hostNodes().simulate('click');
    expect(wrapper.find('#service-menu').hostNodes()).toHaveLength(1);
  });

  it('+++ should open clone modal when pressing clone app from service menu', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <ServiceCard service={mockService} />
      </Provider>,
    );
    wrapper.find('#ellipsis-button').hostNodes().simulate('click');
    expect(wrapper.find('#service-menu').hostNodes()).toHaveLength(1);
    wrapper.find('#make-copy-menu-button').hostNodes().simulate('click');
    expect(wrapper.find('#new-clone-name').hostNodes()).toHaveLength(1);
  });

  it('+++ should display non empty error message when trying to save empty name', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <ServiceCard service={mockService} />
      </Provider>,
    );
    wrapper.find('#ellipsis-button').hostNodes().simulate('click');
    expect(wrapper.find('#service-menu').hostNodes()).toHaveLength(1);
    wrapper.find('#make-copy-menu-button').hostNodes().simulate('click');
    wrapper.find('#new-clone-name-input').hostNodes().simulate('change', { target: { value: '' } });
    wrapper.find('#clone-button').hostNodes().simulate('click');
    const errorPopover = wrapper.find(ErrorPopover);
    expect(errorPopover.text()).toContain('Navnet kan ikke være tomt');
  });

  it('+++ should display invalid name error when trying to save invalid name', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <ServiceCard service={mockService} />
      </Provider>,
    );
    wrapper.find('#ellipsis-button').hostNodes().simulate('click');
    expect(wrapper.find('#service-menu').hostNodes()).toHaveLength(1);
    wrapper.find('#make-copy-menu-button').hostNodes().simulate('click');
    wrapper.find('#new-clone-name-input').hostNodes().simulate('change', { target: { value: '--------' } });
    wrapper.find('#clone-button').hostNodes().simulate('click');
    const errorPopover = wrapper.find(ErrorPopover);
    expect(errorPopover.text()).toContain('Ugyldige karakterer');
  });

  it('+++ should display too long error message when trying to save a too long name ', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <ServiceCard service={mockService} />
      </Provider>,
    );
    wrapper.find('#ellipsis-button').hostNodes().simulate('click');
    expect(wrapper.find('#service-menu').hostNodes()).toHaveLength(1);
    wrapper.find('#make-copy-menu-button').hostNodes().simulate('click');
    wrapper.find('#new-clone-name-input').hostNodes().simulate('change', { target: { value: 'abcdfgtdjstabcdfgtdjstabcdfgtdjst' } });
    wrapper.find('#clone-button').hostNodes().simulate('click');
    const errorPopover = wrapper.find(ErrorPopover);
    expect(errorPopover.text()).toContain('For langt navn');
  });

  it('+++ should display spinner when waiting for response', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <ServiceCard service={mockService} />
      </Provider>,
    );
    wrapper.find('#ellipsis-button').hostNodes().simulate('click');
    expect(wrapper.find('#service-menu').hostNodes()).toHaveLength(1);
    wrapper.find('#make-copy-menu-button').hostNodes().simulate('click');
    wrapper.find('#new-clone-name-input').hostNodes().simulate('change', { target: { value: 'gyldig-navn' } });
    wrapper.find('#clone-button').hostNodes().simulate('click');
    const spinner = wrapper.find(AltinnSpinner);
    expect(spinner).toHaveLength(1);
  });
});
