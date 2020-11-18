import { Action } from 'redux';
import * as ConfigurationActionTypes from '../configurationActionTypes';

export interface IGetOrgs extends Action {

}
export interface IGetOrgsFulfilled extends Action {
  orgs: any;
}
export interface IGetOrgsRejected extends Action {
  error: Error;
}

export function getOrgs(): IGetOrgs {
  return {
    type: ConfigurationActionTypes.GET_ORGS,
  };
}

export function getOrgsFulfilled(orgs: any): IGetOrgsFulfilled {
  return {
    type: ConfigurationActionTypes.GET_ORGS_FULFILLED,
    orgs,
  };
}

export function getOrgsRejected(error: Error): IGetOrgsRejected {
  return {
    type: ConfigurationActionTypes.GET_ORGS_REJECTED,
    error,
  };
}
