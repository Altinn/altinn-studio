import Grid from '@material-ui/core/Grid';
import * as React from 'react';
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
    <InstantiateContainer>
      <Grid
        container={true}
        direction={'row'}
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <main role='main'>
          <Grid container={true}>
            <Grid item={true}>
              <AltinnError
                title={title}
                content={content}
                statusCode={statusCode}
                titleFontWeight={'medium'}
              />
            </Grid>
          </Grid>
        </main>
      </Grid>
    </InstantiateContainer>
  );
}

export default InstantiationErrorPage;
