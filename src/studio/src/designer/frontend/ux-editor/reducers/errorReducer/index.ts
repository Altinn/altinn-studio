import errorReducer, { IErrorStateError } from './errorsReducer';

export interface IErrorState {
  errorList: IErrorStateError[];
}

export default errorReducer;
