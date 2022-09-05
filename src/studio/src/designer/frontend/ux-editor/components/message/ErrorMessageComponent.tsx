import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IErrorStateError, removeError } from '../../features/error/errorSlice';
import type { IAppState } from '../../types/global';

import './ErrorMessageComponent.css';

export function ErrorMessageComponent() {
  const dispatch = useDispatch();
  const errors = useSelector((state: IAppState) => state.errors.errorList);

  const removeClickedError: (index: number) => void = (index: number): void => {
    dispatch(removeError({ errorIndex: index }));
  };

  return (
    <div className='error-snackbar-container'>
      {!errors.length
        ? null
        : errors.map((error: IErrorStateError, index: number) => (
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions
            <div
              key={error.errorMessage}
              onClick={removeClickedError.bind(null, index)}
              className='error-snackbar-items'
            >
              <p>{error.errorMessage}</p>
            </div>
          ))}
    </div>
  );
}
