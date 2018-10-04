import thirdPartyComponentsReducer from './thirdPartyComponentsReducer';

export interface IThirdPartyComponentsState {
  components: any;
  error: Error;
}

export default thirdPartyComponentsReducer;