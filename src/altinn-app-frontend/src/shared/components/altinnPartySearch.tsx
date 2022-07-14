import type { WithStyles } from '@material-ui/core';
import { createStyles, Grid, withStyles } from '@material-ui/core';
import React from 'react';
import { AltinnInput } from 'altinn-shared/components';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { useAppSelector } from 'src/common/hooks';
import { getLanguageFromKey } from 'altinn-shared/utils';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchUpdated(e.target.value);
  };

  return (
    <Grid
      container={true}
      className={classes.partySearchContainer}
    >
      <AltinnInput
        label={getLanguageFromKey(
          'party_selection.search_placeholder',
          language,
        )}
        showLabel={false}
        onChange={handleChange}
        placeholder={getLanguageFromKey(
          'party_selection.search_placeholder',
          language,
        )}
        iconString='fa fa-others'
      />
    </Grid>
  );
}

export default withStyles(styles)(AltinnPartySearch);
