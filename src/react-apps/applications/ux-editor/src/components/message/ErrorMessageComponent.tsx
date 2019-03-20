import * as React from 'react';
import { connect } from 'react-redux';
import errorActionDispatcher from '../../actions/errorActions/errorActionDispatcher';
import { IErrorStateError } from '../../reducers/errorReducer/errorsReducer';
import '../../styles/ErrorMessageComponent.css';

export interface IErrorMessageContainerProps {
  errors: IErrorStateError[];
}

const removeClickedError: (index: number) => void = (index: number): void => {
  errorActionDispatcher.removeError(index);
};

const ErrorMessageContainer: React.StatelessComponent<IErrorMessageContainerProps> = (
  props: IErrorMessageContainerProps,
) => (
    <div className={'error-snackbar-container'}>
      {
        !props.errors.length ?
          null :
          props.errors.map((error: IErrorStateError, index: number) => (
            <div key={index} onClick={removeClickedError.bind(null, index)} className={'error-snackbar-items'}>
              <p>{error.errorMessage}</p>
            </div>
          ))
      }
    </div>
  );

const mapStateToProps: (
  state: IAppState,
  props: any,
) => IErrorMessageContainerProps = (state: IAppState, props: any): IErrorMessageContainerProps => ({
  errors: state.errors.errorList,
});

export const ErrorMessageComponent = connect(mapStateToProps)(ErrorMessageContainer);
