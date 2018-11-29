import { withStyles, WithStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import * as React from 'react';
import 'typeface-roboto';

export interface IOrganizationOverviewComponentProps extends WithStyles<typeof styles> {
}
export interface IOrganizationOverviewComponentState { }

const styles = {}

class OrganizationOverviewComponent extends React.Component<IOrganizationOverviewComponentProps, IOrganizationOverviewComponentState> {
  public state: IOrganizationOverviewComponentState = {

  }

  public render() {
    return (
      <div>
        <Typography component='h3' variant='h3' gutterBottom={true}> Organisasjoner med redigeringstilgang</Typography>
        <Typography component='h4' variant='h4' gutterBottom={true}> Her er en oversikt over organisasjoner du har rettigheter til:</Typography>
        <div>
          <Typography component='h2' variant='h2'>Du har ikke fått tilganger til noen organisasjoner</Typography>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(OrganizationOverviewComponent);
