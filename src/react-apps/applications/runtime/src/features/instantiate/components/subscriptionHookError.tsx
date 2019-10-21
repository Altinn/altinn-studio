import { Grid } from '@material-ui/core';
import React = require('react');
import AltinnError from '../../../shared/components/altinnError';
import { ITextResource } from '../../../types/global';
import { getTextResourceByKey } from '../../../utils/textResource';

export interface ISubscriptionHookProps {
  textResources: ITextResource[];
}

function SubscriptionHookError(props: ISubscriptionHookProps) {
  return(
    <Grid container={true} justify={'center'} alignContent={'center'} alignItems={'center'}>
      <Grid item={true}>
        <AltinnError
          title={getTextResourceByKey('subscription_hook_error_title', props.textResources)}
          content={getTextResourceByKey('subscription_hook_error_content', props.textResources)}
          statusCode={getTextResourceByKey('subscription_hook_error_statusCode', props.textResources)}
          url={getTextResourceByKey('subscription_hook_error_url', props.textResources)}
          urlText={getTextResourceByKey('subscription_hook_error_urlText', props.textResources)}
          urlTextSuffix={getTextResourceByKey('subscription_hook_error_urlTextSuffix', props.textResources)}
        />
      </Grid>
    </Grid>
  );
}

export default SubscriptionHookError;
