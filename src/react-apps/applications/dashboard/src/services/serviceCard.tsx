import { Card, CardActionArea, CardContent, Grid, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import TruncateMarkup from 'react-truncate-markup';

export interface IServiceCardCompontentProvidedProps {
  classes: any;
  service: any;
}

export interface IServiceCardComponentProps extends IServiceCardCompontentProvidedProps {
}
export interface IServiceCardComponentState {
}

const styles = {
  displayInlineBlock: {
    display: 'inline-block',
  },
  width100: {
    width: '100%',
  },
  card: {
    background: '#EFEFEF',
    borderRadius: '0px',
    height: '154px',
    maxHeight: '154px',
    minHeight: '154px',
    '&:hover': {
      background: '#e5e5e5',
      cursor: 'pointer',
    }
  },
  iconStyling: {
    fontSize: '35px',
    textAlign: 'right' as 'right',
  },
  textToRight: {
    textAlign: 'right' as 'right',
  },
  height: {
    height: '70px',
  },
}

class ServiceCard extends React.Component<IServiceCardComponentProps, IServiceCardComponentState> {
  public formatDate(date: any): any {
    return moment(new Date(date)).format('DD.MM.YYYY');
  }

  public openService = () => {
    window.location.href = `/designer/${this.props.service.full_name}`;
  }

  public render() {
    const { classes, service } = this.props;
    return (
      <Card elevation={0} className={classNames(classes.card)}>
        <CardActionArea onClick={this.openService}>
          <CardContent>
            <Grid container={true} spacing={8}>
              <Grid item={true} xl={10} lg={10} md={10} sm={10} xs={10}>
                <Typography
                  variant='subtitle2'
                  className={classNames(classes.displayInlineBlock, classes.width100)}
                  noWrap={true}
                >
                  {service.name}
                </Typography>
              </Grid>
              <Grid item={true} xl={1} lg={1} md={1} sm={1} xs={1}>
                <i
                  className={classNames(classes.iconStyling,
                    { ['ai ai-corp']: service.owner.UserType === 2 },
                    { ['ai ai-private']: service.owner.UserType !== 2 })}
                  aria-hidden='true'
                />
              </Grid>
              <Grid item={true} xl={1} lg={1} md={1} sm={1} xs={1}>
                <i
                  className={classNames(classes.iconStyling,
                    { ['ai ai-read']: service.permissions.push === false },
                    { ['ai ai-write']: service.permissions.push === true })}
                  aria-hidden='true'
                />
              </Grid>
              <Grid
                item={true}
                className={classNames(
                  classes.displayInlineBlock,
                  classes.width100,
                  classes.height)}
              >
                <Typography variant='body1' gutterBottom={true} className={classes.width100}>
                  <TruncateMarkup lines={2}>
                    <span>
                      {service.description}
                    </span>
                  </TruncateMarkup>
                </Typography>
              </Grid>
            </Grid>
            <Grid container={true} spacing={0} direction='row'>
              <Grid item={true} xl={6} lg={6} md={6} sm={6} xs={6}>
                <Typography
                  variant='body2'
                  className={classNames(classes.displayInlineBlock, classes.width100)}
                  noWrap={true}
                >
                  {service.owner.full_name || service.owner.login}
                </Typography>
              </Grid>
              <Grid item={true} xl={6} lg={6} md={6} sm={6} xs={6}>
                <Typography
                  variant='body2'
                  className={classNames(
                    classes.displayInlineBlock,
                    classes.width100,
                    classes.textToRight)}
                  noWrap={true}
                >
                  Endret: {this.formatDate(service.updated_at)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  }
}

export default withStyles(styles)(ServiceCard);
