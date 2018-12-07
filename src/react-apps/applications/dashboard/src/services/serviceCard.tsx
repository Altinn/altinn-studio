import { Card, CardContent, Grid, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import Truncate from 'react-truncate';
import 'typeface-roboto';

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

  public render() {
    return (
      <Card elevation={0} className={classNames(this.props.classes.card)}>
        <CardContent>
          <Grid container={true} spacing={8}>
            <Grid item={true} xl={10} lg={10} md={10} sm={10} xs={10}>
              <Typography
                variant='h6'
                className={classNames(this.props.classes.displayInlineBlock, this.props.classes.width100)}
                noWrap={true}
              >
                {this.props.service.name}
              </Typography>
            </Grid>
            <Grid item={true} xl={1} lg={1} md={1} sm={1} xs={1}>
              <i
                className={classNames(this.props.classes.iconStyling,
                  { ['ai ai-corp']: this.props.service.owner.UserType === 2 },
                  { ['ai ai-private']: this.props.service.owner.UserType !== 2 })}
                aria-hidden='true'
              />
            </Grid>
            <Grid item={true} xl={1} lg={1} md={1} sm={1} xs={1}>
              <i
                className={classNames(this.props.classes.iconStyling,
                  { ['ai ai-read']: this.props.service.permissions.push === false },
                  { ['ai ai-write']: this.props.service.permissions.push === true })}
                aria-hidden='true'
              />
            </Grid>
            <Grid
              item={true}
              className={classNames(
                this.props.classes.displayInlineBlock,
                this.props.classes.width100,
                this.props.classes.height)}
            >
              <Typography variant='body1' gutterBottom={true}>
                <Truncate lines={3} ellipsis={<span>...</span>}>
                  {this.props.service.description}
                </Truncate>
              </Typography>
            </Grid>
          </Grid>
          <Grid container={true} spacing={0} direction='row'>
            <Grid item={true} xl={6} lg={6} md={6} sm={6} xs={6}>
              <Typography
                variant='subtitle2'
                className={classNames(this.props.classes.displayInlineBlock, this.props.classes.width100)}
                noWrap={true}
              >
                {this.props.service.owner.full_name || this.props.service.owner.login}
              </Typography>
            </Grid>
            <Grid item={true} xl={6} lg={6} md={6} sm={6} xs={6}>
              <Typography
                variant='subtitle2'
                className={classNames(
                  this.props.classes.displayInlineBlock,
                  this.props.classes.width100,
                  this.props.classes.textToRight)}
                noWrap={true}
              >
                Endret: {this.formatDate(this.props.service.updated_at)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }
}

export default withStyles(styles)(ServiceCard);
