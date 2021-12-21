import { createStyles, Grid, WithStyles, withStyles } from '@material-ui/core';
import * as React from 'react';
import { AltinnInput } from 'altinn-shared/components';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { useAppSelector } from 'src/common/hooks';

const styles = createStyles({
  partySearchContainer: {
    width: '50%',
    border: `2px solid ${AltinnAppTheme.altinnPalette.primary.blue}`,
  },
});

export interface IAltinnPartySearchProps extends WithStyles<typeof styles> {
  onSearchUpdated: (searchString: string) => void;
}

function AltinnPartySearch({
  classes,
  onSearchUpdated,
}: IAltinnPartySearchProps) {
  const language = useAppSelector((state) => state.language.language);

  const [searchString, setSearchString] = React.useState('');

  React.useEffect(() => {
    onSearchUpdated(searchString);
  }, [searchString, onSearchUpdated]);

  const handleChangeSearchString = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchString(e.target.value);
  };

  return (
    <Grid container={true} className={classes.partySearchContainer}>
      <AltinnInput
        label={
          !language.party_selection
            ? 'party_selection.search_placeholder'
            : language.party_selection.search_placeholder
        }
        showLabel={false}
        onChange={handleChangeSearchString}
        placeholder={
          !language.party_selection
            ? 'party_selection.search_placeholder'
            : language.party_selection.search_placeholder
        }
        iconString='fa fa-others'
      />
    </Grid>
  );
}

export default withStyles(styles)(AltinnPartySearch);
