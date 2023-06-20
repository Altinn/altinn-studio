import React from 'react';

import { Grid, makeStyles } from '@material-ui/core';

import { AltinnInput } from 'src/components/AltinnInput';
import { useLanguage } from 'src/hooks/useLanguage';

const useStyles = makeStyles((theme) => ({
  partySearchContainer: {
    width: '50%',
    border: `2px solid ${theme.altinnPalette.primary.blue}`,
  },
}));

export interface IAltinnPartySearchProps {
  onSearchUpdated: (searchString: string) => void;
}

export function AltinnPartySearch({ onSearchUpdated }: IAltinnPartySearchProps) {
  const classes = useStyles();
  const { langAsString } = useLanguage();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchUpdated(e.target.value);
  };

  return (
    <Grid
      container={true}
      className={classes.partySearchContainer}
    >
      <AltinnInput
        label={langAsString('party_selection.search_placeholder')}
        showLabel={false}
        onChange={handleChange}
        placeholder={langAsString('party_selection.search_placeholder')}
        iconString='fa fa-others'
      />
    </Grid>
  );
}
