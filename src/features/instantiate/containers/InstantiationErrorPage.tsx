import React from 'react';
import type { RouteProps } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';

import { AltinnError } from 'src/components/altinnError';
import { InstantiationContainer } from 'src/features/instantiate/containers/InstantiationContainer';

export type IInstantiationErrorPageProps = {
  title: string | JSX.Element | JSX.Element[] | null;
  content: React.ReactNode;
  statusCode: string;
} & RouteProps;

export function InstantiationErrorPage({ content, statusCode, title }: IInstantiationErrorPageProps) {
  return (
    <InstantiationContainer type='partyChoice'>
      <Grid
        container={true}
        direction='row'
      >
        <AltinnError
          title={title}
          content={content}
          statusCode={statusCode}
        />
      </Grid>
    </InstantiationContainer>
  );
}
