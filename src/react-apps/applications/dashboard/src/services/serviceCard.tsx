import { Card, CardActionArea, CardContent, Grid, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import TruncateMarkup from 'react-truncate-markup';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';

export interface IServiceCardCompontentProvidedProps {
  classes: any;
  service: any;
}

export interface IServiceCardCompontentProps extends IServiceCardCompontentProvidedProps {
  language: any;
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
  fontSize_16: {
    fontSize: '16px',
  },
  fontWeight_500: {
    fontWeight: 500,
  },
  fontSize_14: {
    fontSize: '14px',
  }
}

class ServiceCard extends React.Component<IServiceCardCompontentProps, IServiceCardComponentState> {
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
                  variant='h3'
                  className={classNames(classes.displayInlineBlock, classes.width100, classes.fontSize_16, classes.fontWeight_500)}
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
                <Typography gutterBottom={true} className={classNames(classes.width100, classes.fontSize_14)}>
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
                  className={classNames(classes.displayInlineBlock, classes.width100, classes.fontSize_14, classes.fontWeight_500)}
                  noWrap={true}
                >
                  {service.owner ? (service.owner.full_name || service.owner.login) : ''}
                </Typography>
              </Grid>
              <Grid item={true} xl={6} lg={6} md={6} sm={6} xs={6}>
                <Typography
                  className={classNames(
                    classes.displayInlineBlock,
                    classes.width100,
                    classes.textToRight,
                    classes.fontSize_14,
                    classes.fontWeight_500)}
                  noWrap={true}
                >
                  {getLanguageFromKey('dashboard.last_changed_service', this.props.language)} {this.formatDate(service.updated_at)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  }
}

const mapStateToProps = (
  state: IDashboardAppState,
  props: IServiceCardCompontentProvidedProps,
): IServiceCardCompontentProps => {
  return {
    classes: props.classes,
    service: props.service,
    language: state.language.language,
  };
};

export default withStyles(styles)(connect(mapStateToProps)(ServiceCard));
