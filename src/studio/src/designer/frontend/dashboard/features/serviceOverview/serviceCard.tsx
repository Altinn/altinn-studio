import { Card, CardActionArea, CardContent, Grid, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import TruncateMarkup from 'react-truncate-markup';
import { getLanguageFromKey } from 'app-shared/utils/language';

export interface IServiceCardComponentProvidedProps {
  classes: any;
  service: any;
}

export interface IServiceCardComponentProps extends IServiceCardComponentProvidedProps {
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
    },
  },
  iconStyling: {
    fontSize: '35px',
    textAlign: 'right' as 'right',
  },
  avatar: {
    maxHeight: '1.5em',
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
  },
};

export class ServiceCardComponent extends React.Component<IServiceCardComponentProps, IServiceCardComponentState> {
  public openService = () => {
    const repoPath = this.props.service.full_name;
    if (this.props.service.is_cloned_to_local) {
      if (repoPath.endsWith('-datamodels')) {
        window.location.assign(`#/datamodelling/${repoPath}`);
      } else {
        window.location.assign(`/designer/${repoPath}`);
      }
    } else {
      // eslint-disable-next-line max-len
      window.location.assign(`/Home/Index#/clone-app/${this.props.service.owner.login}/${this.props.service.name}`);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  public formatDate(date: any): any {
    return moment(new Date(date)).format('DD.MM.YYYY');
  }

  public render() {
    const { classes, service } = this.props;
    return (
      <Card elevation={0} className={classNames(classes.card)}>
        <CardActionArea onClick={this.openService}>
          <CardContent>
            <Grid container={true} spacing={1}>
              <Grid
                item={true}
                xl={11}
                lg={11}
                md={11}
                sm={11}
                xs={11}
              >
                <Typography
                  variant='h3'
                  className={
                    classNames(
                      classes.displayInlineBlock,
                      classes.width100,
                      classes.fontSize_16,
                      classes.fontWeight_500,
                    )}
                  noWrap={true}
                >
                  {service.name}
                </Typography>
              </Grid>
              <Grid
                item={true} xl={1}
                lg={1} md={1}
                sm={1} xs={1}
              >
                <i
                  className={classNames(classes.iconStyling,
                    { 'fa fa-read': service.permissions.push === false },
                    { 'fa fa-write': service.permissions.push === true })}
                  aria-hidden='true'
                />
              </Grid>
              <Grid
                item={true}
                className={classNames(
                  classes.displayInlineBlock,
                  classes.width100,
                  classes.height,
                )}
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
            <Grid
              container={true} spacing={0}
              direction='row'
            >
              <Grid
                item={true} xl={6}
                lg={6} md={6}
                sm={6} xs={6}
              >
                <Typography
                  className={
                    classNames(
                      classes.displayInlineBlock, classes.width100, classes.fontSize_14, classes.fontWeight_500,
                    )}
                  noWrap={true}
                >
                  <img
                    src={service.owner.avatar_url}
                    className={classNames(classes.avatar)}
                    alt=''
                  /> {service.owner ? (service.owner.full_name || service.owner.login) : ''}
                </Typography>
              </Grid>
              <Grid
                item={true} xl={6}
                lg={6} md={6}
                sm={6} xs={6}
              >
                <Typography
                  className={classNames(
                    classes.displayInlineBlock,
                    classes.width100,
                    classes.textToRight,
                    classes.fontSize_14,
                    classes.fontWeight_500,
                  )}
                  noWrap={true}
                >
                  {getLanguageFromKey(
                    'dashboard.last_changed_service', this.props.language,
                  )} {this.formatDate(service.updated_at)}
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
  props: IServiceCardComponentProvidedProps,
): IServiceCardComponentProps => {
  return {
    classes: props.classes,
    service: props.service,
    language: state.language.language,
  };
};

export const ServiceCard = withStyles(styles)(connect(mapStateToProps)(ServiceCardComponent));
