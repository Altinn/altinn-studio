import React from 'react';
import Grid from '@material-ui/core/Grid';

import { RouteProps } from 'react-router';
import AltinnError from '../../../shared/components/altinnError';
import InstantiateContainer from './InstantiationContainer';

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
      <Grid container={true} direction='row'>
        <AltinnError title={title} content={content} statusCode={statusCode} />
      </Grid>
    </InstantiateContainer>
  );
}

export default InstantiationErrorPage;
