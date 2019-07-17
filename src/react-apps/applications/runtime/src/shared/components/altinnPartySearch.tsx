import {
  createStyles,
  Grid,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import * as React from 'react';
import AltinnInput from 'Shared/components/AltinnInput';

const styles = createStyles({
  partySearchContainer: {
    width: '50%',
    marginBottom: 12,
  },
});

export interface IAltinnPartySearchProps extends WithStyles<typeof styles> {
  onSearchUpdated: (searchString: string) => void;
}

function AltinnPartySearch(props: IAltinnPartySearchProps) {
  const [ searchString, setSearchString ] = React.useState('');
  const { classes, onSearchUpdated } = props;

  React.useEffect(() => {
    onSearchUpdated(searchString);
  }, []);

  function onChangeSearchString(e: any) {
    setSearchString(e.target.value);
  }

  return (
    <Grid container={true} className={classes.partySearchContainer}>
      <AltinnInput
        id={'party-search-input'}
        onChangeFunction={onChangeSearchString}
        placeholder={'Søk etter aktør'}
      />
    </Grid>
  );
}

export default withStyles(styles)(AltinnPartySearch);
