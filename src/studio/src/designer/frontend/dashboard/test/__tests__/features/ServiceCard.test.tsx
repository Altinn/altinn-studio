import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import { mount } from 'enzyme';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
// eslint-disable-next-line import/no-named-as-default
import ServiceCard from '../../../features/serviceOverview/serviceCard';
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
});
