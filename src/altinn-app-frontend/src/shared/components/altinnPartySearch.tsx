import React from 'react';

import { Grid, makeStyles } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';

import { AltinnInput } from 'altinn-shared/components';
import { getLanguageFromKey } from 'altinn-shared/utils';

const useStyles = makeStyles((theme) => ({
  partySearchContainer: {
    width: '50%',
    border: `2px solid ${theme.altinnPalette.primary.blue}`,
  },
}));

export interface IAltinnPartySearchProps {
  onSearchUpdated: (searchString: string) => void;
}

function AltinnPartySearch({ onSearchUpdated }: IAltinnPartySearchProps) {
  const classes = useStyles();
  const language = useAppSelector((state) => state.language.language);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchUpdated(e.target.value);
  };

  if (!language) {
    return null;
  }

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

export default AltinnPartySearch;
