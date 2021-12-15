import * as React from 'react';
import { Grid } from '@mui/material';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useAppSelector } from 'common/hooks';

export interface ResourceItemProps {
  link: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export function ResourceItem({
  link,
  label,
  description,
  icon,
}: ResourceItemProps) {
  const language = useAppSelector(state => state.language.language);

  return (
    <Grid
      container
      direction='row'
      alignItems='flex-start'
      justifyContent='flex-start'
      spacing={2}
    >
      <Grid item xs='auto'>
        {icon}
      </Grid>
      <Grid item xs>
        <a href={link} target="_blank" rel="noopener noreferrer">
          <p style={{ fontWeight: 500, color: 'black', margin: 0 }}>
            {getLanguageFromKey(label, language)}{' '}
          </p>{' '}
        </a>
        <p style={{ marginTop: 0 }}>{getLanguageFromKey(description, language)}</p>
      </Grid>
    </Grid>
  );
}
