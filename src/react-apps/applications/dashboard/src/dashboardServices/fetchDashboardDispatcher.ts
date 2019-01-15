import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../store';
import * as FetchDashboardActions from './fetchDashboardActions';

/**
 * Define a interface describing the the different Actions available
 * for AppConfig and which datamodel those actions expect.
 */
export interface IFetchDashboardDispatchers extends ActionCreatorsMapObject {
  fetchServices: (
    url: string,
  ) => FetchDashboardActions.IFetchServicesAction;
  fetchServicesFulfilled: (
    services: any,
  ) => FetchDashboardActions.IFetchServicesFulfilled;
  fetchServicesRejected: (
    error: Error,
  ) => FetchDashboardActions.IFetchServicesRejected;
  fetchCurrentUser: (
    url: string,
  ) => FetchDashboardActions.IFetchCurrentUserAction;
  fetchCurrentUserFulfilled: (
    user: any,
  ) => FetchDashboardActions.IFetchCurrentUserFulfilled;
  fetchCurrentUserRejected: (
    error: Error,
  ) => FetchDashboardActions.IFetchCurrentUserRejected;
  fetchOrganizations: (
    url: string,
  ) => FetchDashboardActions.IFetchOrganizationsAction;
  fetchOrganizationsFulfilled: (
    organizations: any,
  ) => FetchDashboardActions.IFetchOrganizationsFulfilled;
  fetchOrganizationsRejected: (
    error: Error,
  ) => FetchDashboardActions.IFetchOrganizationsRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */
const actions: IFetchDashboardDispatchers = {
  fetchServices: FetchDashboardActions.fetchServicesAction,
  fetchServicesFulfilled: FetchDashboardActions.fetchServicesFulfilledAction,
  fetchServicesRejected: FetchDashboardActions.fetchServicesRejectedAction,
  fetchCurrentUser: FetchDashboardActions.fetchCurrentUserAction,
  fetchCurrentUserFulfilled: FetchDashboardActions.fetchCurrentUserFulfilledAction,
  fetchCurrentUserRejected: FetchDashboardActions.fetchCurrentUserRejectedAction,
  fetchOrganizations: FetchDashboardActions.fetchOrganizationsAction,
  fetchOrganizationsFulfilled: FetchDashboardActions.fetchOrganizationsFulfilledAction,
  fetchOrganizationsRejected: FetchDashboardActions.fetchOrganizationsRejectedAction,
};

/**
 * Bind action creators to redux store
 */
const FetchDashboardActionDispatchers: IFetchDashboardDispatchers = bindActionCreators<
  any,
  IFetchDashboardDispatchers
  >(actions, store.dispatch);

/**
 * Export the App Config dispatcher to be used from REACT components
 */
export default FetchDashboardActionDispatchers;
