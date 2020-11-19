import { IRepository } from 'app-shared/types';
import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
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
    services: IRepository[],
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
  fetchOrganisations: (
    url: string,
  ) => FetchDashboardActions.IFetchOrganisationsAction;
  fetchOrganisationsFulfilled: (
    organisations: any,
  ) => FetchDashboardActions.IFetchOrganisationsFulfilled;
  fetchOrganisationsRejected: (
    error: Error,
  ) => FetchDashboardActions.IFetchOrganisationsRejected;
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
  fetchOrganisations: FetchDashboardActions.fetchOrganisationsAction,
  fetchOrganisationsFulfilled: FetchDashboardActions.fetchOrganisationsFulfilledAction,
  fetchOrganisationsRejected: FetchDashboardActions.fetchOrganisationsRejectedAction,
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
