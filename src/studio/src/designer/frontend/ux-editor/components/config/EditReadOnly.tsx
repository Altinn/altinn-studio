import { Grid } from '@material-ui/core';
import AltinnCheckBox from 'app-shared/components/AltinnCheckBox';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { IAppState } from '../../types/global';
import { IGenericEditComponent } from './componentConfig';

const styles = {
  gridItem: {
    marginTop: '18px',
  }
};

export const EditReadOnly = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  const [checked, setChecked] = React.useState(component.readOnly);

  const handleChange = () => {
    setChecked(!checked);
    handleComponentChange({
      ...component,
      readOnly: !component.readOnly,
    });
  }

  return (
    <Grid item={true} xs={12} style={styles.gridItem}>
      <AltinnCheckBox
        checked={checked}
        onChangeFunction={handleChange}
      />
      {language.ux_editor.modal_configure_read_only}
    </Grid>
  )
}
