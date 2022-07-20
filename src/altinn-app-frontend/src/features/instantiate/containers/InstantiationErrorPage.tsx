import React from 'react';
import type { RouteProps } from 'react-router';

import Grid from '@material-ui/core/Grid';

import InstantiateContainer from 'src/features/instantiate/containers/InstantiationContainer';
import AltinnError from 'src/shared/components/altinnError';

export interface IInstantiationErrorPageProps extends RouteProps {
  title: string;
  content: React.ReactNode;
  statusCode: string;
}

function InstantiationErrorPage({
  content,
  statusCode,
  title,
}: IInstantiationErrorPageProps) {
  return (
    <InstantiateContainer type='partyChoice'>
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
    </InstantiateContainer>
  );
}

export default InstantiationErrorPage;
