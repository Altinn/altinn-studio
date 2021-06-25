import Grid from '@material-ui/core/Grid';
import * as React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { RouteProps } from 'react-router';
import AltinnError from '../../../shared/components/altinnError';
import InstantiateContainer from './InstantiationContainer';

export interface IInstantiationErrorPageProps extends RouteProps {
  title: string;
  content: React.ReactNode;
  statusCode: string;
}

function InstantiationErrorPage(props: IInstantiationErrorPageProps) {
  const {
    content,
    statusCode,
    title,
  } = props;

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
