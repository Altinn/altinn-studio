import * as React from 'react';
import { useSelector } from 'react-redux';
import { IRuntimeState } from '../../../types';
import InstantiationErrorPage from './InstantiationErrorPage';

function UnknownError() {
  const language = useSelector((state: IRuntimeState) => state.language.language);
  if (!language) {
    return null;
  }

  return (
    <InstantiationErrorPage
      title={`${language.instantiate.unknown_error_title}`}
      content={`${language.instantiate.unknown_error_text}`}
      statusCode={`${language.instantiate.unknown_error_status}`}
    />
  );
}
export default UnknownError;
