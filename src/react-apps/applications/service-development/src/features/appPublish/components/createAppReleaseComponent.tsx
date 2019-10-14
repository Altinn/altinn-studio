import {
  createStyles,
  Grid,
  InputLabel,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import * as React from 'react';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import AltinnInput, {NewAltinnInput} from '../../../../../shared/src/components/AltinnInput';

const styles = createStyles({
  createReleaseTitle: {
    fontSize: '2rem',
  },
  createReleaseFormItem: {
    padding: '1.2rem',
  },
});

export interface ICreateAppReleaseComponent extends WithStyles<typeof styles> {
}

function ReleaseComponent(props: ICreateAppReleaseComponent) {
  const [version, setVersion] = React.useState('');
  const [description, setDescription] = React.useState('');

  function handleVersionChange(event: React.ChangeEvent<HTMLInputElement>) {
    setVersion(event.currentTarget.value);
  }

  function handleDescriptionChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescription(event.currentTarget.value);
  }

  function handleBuildVersionClick() {
    // TODO: magic
  }

  const { classes } = props;
  return (
    <Grid
      container={true}
      direction={'column'}
    >
      <Grid
        item={true}
        className={classes.createReleaseFormItem}
      >
        <Typography className={classes.createReleaseTitle}>
          Bygg en versjon av appen din utefra den siste commiten til master
        </Typography>
      </Grid>
      <Grid
        item={true}
        className={classes.createReleaseFormItem}
      >
        <NewAltinnInput
          label={'Versjonnummer'}
          onChange={handleVersionChange}
          value={version}
          widthPercentage={50}
          iconString={'fa fa-search'}
        />
      </Grid>
      <Grid
        item={true}
        className={classes.createReleaseFormItem}
      >
        <InputLabel>Beskrivelse av innhold</InputLabel>
      </Grid>
      <Grid
        item={true}
        className={classes.createReleaseFormItem}
      >
        <AltinnButton
          classes={{}}
          onClickFunction={handleBuildVersionClick}
          btnText={'Bygg versjon'}
        />
      </Grid>
    </Grid>
  );
}

export default withStyles(styles)(ReleaseComponent);
