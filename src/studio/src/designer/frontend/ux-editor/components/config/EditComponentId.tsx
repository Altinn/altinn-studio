import { Grid } from '@material-ui/core';
import * as React from 'react';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import { getLanguageFromKey } from 'app-shared/utils/language';
import ErrorPopover from 'app-shared/components/ErrorPopover';

export interface IEditComponentId {
  handleNewId: (id: string) => void;
  id: string;
  language: any;
  error: string;
  handleClosePopup: () => void;
}
export const EditComponentId = ({
  handleNewId,
  id,
  language,
  error,
  handleClosePopup,
}: IEditComponentId ) => {
  const [idValue, setIdValue] = React.useState(id);
  const errorMessageRef = React.useRef(null);

  const handleChange = (event: any) => {
    setIdValue(event.target.value);
  }

  const handleBlur = () => {
    handleNewId(idValue);
  }

  return (
    <Grid item={true} xs={12}>
      <AltinnInputField
        id='edit-component-id'
        onChangeFunction={handleChange}
        onBlurFunction={handleBlur}
        inputValue={idValue}
        inputDescription={getLanguageFromKey(
          'ux_editor.modal_properties_component_change_id',
          language,
        )}
        inputFieldStyling={{ width: '100%' }}
        inputDescriptionStyling={{ marginTop: '24px' }}
      />
      <div ref={errorMessageRef} />
      <ErrorPopover
        anchorEl={
          error ? errorMessageRef.current : null
        }
        onClose={handleClosePopup}
        errorMessage={error}
      />
    </Grid>
  );
}
