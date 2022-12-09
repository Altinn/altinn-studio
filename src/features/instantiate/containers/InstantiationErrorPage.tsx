import React from 'react';
import type { RouteProps } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';

import { InstantiationContainer } from 'src/features/instantiate/containers';
import AltinnError from 'src/shared/components/altinnError';

export type IInstantiationErrorPageProps = {
  title: string | JSX.Element | JSX.Element[];
  content: React.ReactNode;
  statusCode: string;
} & RouteProps;

function InstantiationErrorPage({ content, statusCode, title }: IInstantiationErrorPageProps) {
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

export default InstantiationErrorPage;
