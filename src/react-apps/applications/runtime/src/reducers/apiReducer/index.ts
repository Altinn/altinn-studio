import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ApiActions from '../../actions/apiActions/actions';
import * as ApiActionTypes from '../../actions/apiActions/apiActionTypes';

import * as ManageJsonFileActions from '../../actions/manageServiceConfigurationActions/actions';
import * as ManageJsonFileActionTypes from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionTypes';

export interface IApiConnection {
  [key: string]: any;
  externalApiId?: any;
  codeListId?: any;
  clientParams: any;
  metaParams: any;
  apiResponseMapping: any;
}

export interface IApiState {
  connections: IApiConnection;
  externalApisById: any;
  externalApisIds: any[];
  availableCodeLists: any;
}

const initialState: IApiState = {
  connections: null,
  externalApisById: {
    id1: {
      id: 'id1',
      name: 'Bring postnummer API',
      type: 'value',
      shortname: 'Postnummer',
      uri: 'https://api.bring.com/shippingguide/api/postalCode.json?',
      description: 'Api for å hente poststed basert på postnummer',
      clientParams: {
        pnr: {
          type: 'queryString',
          name: 'pnr',
          value: '',
          required: true,
          example: 'Example: 2050',
        },
      },
      metaParams: {
        clientUrl: {
          type: 'queryString',
          name: 'clientUrl',
          value: '',
          required: true,
          example: 'Example: http://www.sitename.com',
          urlEncode: true,
        },
      },
    },
    id2: {
      id: 'id2',
      name: 'SSB kommuneliste API',
      type: 'list',
      shortname: 'Kommuneliste',
      uri: 'http://data.ssb.no/api/klass/v1/classifications/131/codes?',
      description: 'Api for å hente liste over kommuner i Norge gylidig i gitt tidsrom',
      clientParams: {},
      metaParams: {
        from: {
          type: 'queryString',
          name: 'from',
          value: '2018-01-01',
          required: true,
          example: '2018-01-01',
          urlEncode: false,
        },
        to: {
          type: 'queryString',
          name: 'to',
          value: '2018-08-01',
          required: true,
          example: '2018-08-01',
          urlEncode: false,
        },
      },
    },
  },
  externalApisIds: ['id1', 'id2'],
  availableCodeLists: null,
};

const apiReducer: Reducer<IApiState> = (
  state: IApiState = initialState,
  action?: Action,
): any => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ApiActionTypes.ADD_API_CONNECTION_FULFILLED: {
      const { newConnection } = action as ApiActions.IAddApiConnectionFulfilled;
      return update<any>(state, {
        connections: {
          $apply: () => ({
            ...state.connections,
            ...newConnection,
          }),
        },
      });
    }

    case ApiActionTypes.DELETE_API_CONNECTION_FULFILLED: {
      const { newConnectionsObj } = action as ApiActions.IDelApiConnectionFulfilled;
      return update<any>(state, {
        connections: {
          $apply: () => ({
            ...newConnectionsObj,
          }),
        },
      });
    }

    case ManageJsonFileActionTypes.FETCH_JSON_FILE_FULFILLED: {
      const { data } = action as ManageJsonFileActions.IFetchJsonFileFulfilledAction;
      return update<any>(state, {
        connections: {
          $set: data.APIs.connections,
        },
      });
    }

    default:
      return state;
  }
};

export default apiReducer;
