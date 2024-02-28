import React from 'react';
import type { RouteProps } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';

import { AltinnError } from 'src/components/altinnError';
import { InstantiationContainer } from 'src/features/instantiate/containers/InstantiationContainer';

export type IInstantiationErrorPageProps = {
  title: React.ReactNode;
  content: React.ReactNode;
  statusCode?: React.ReactNode;
  showContactInfo?: boolean;
} & RouteProps;

export function InstantiationErrorPage({ content, statusCode, title, showContactInfo }: IInstantiationErrorPageProps) {
  return (
    <InstantiationContainer>
      <Grid
        container={true}
        direction='row'
      >
        <AltinnError
          title={title}
          content={content}
          statusCode={statusCode}
          showContactInfo={showContactInfo}
        />
      </Grid>
    </InstantiationContainer>
  );
}
