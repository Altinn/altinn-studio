import { Card, Grid } from '@material-ui/core';
import { CardContent } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import Truncate from 'react-truncate';
import 'typeface-roboto';

export interface ICategoryComponentProvidedProps {
  classes: any;
  header: string;
  categoryRepos: any;
  className: string;
}

export interface ICategoryComponentProps extends ICategoryComponentProvidedProps {
  organizations: string[];
}
export interface ICategoryComponentState {
}

const styles = {
  mar_top_100: {
    marginTop: '100px',
  },
  displayInlineBlock: {
    display: 'inline-block',
  },
  iconStyling: {
    fontSize: '35px',
  },
  width100: {
    width: '100%',
  },
  height: {
    height: '70px',
  },
  overflow: {
    overflow: 'hidden',
  },
  textToRight: {
    textAlign: 'right' as 'right',
  },
  card: {
    background: '#EFEFEF',
    borderRadius: '0px',
    height: '154px',
    maxHeight: '154px',
    minHeight: '154px',
  },
}

const filterOnOrgName = (organizations: any) => {
  const allOrgNames: string[] = [];
  organizations.map((key: any) => {
    if (allOrgNames.indexOf(key.username) === -1) {
      allOrgNames.push(key.username);
    }
  });
  return allOrgNames;
};

class CategoryComponent extends React.Component<ICategoryComponentProps, ICategoryComponentState> {
  public formatDate(date: any): any {
    return moment(new Date(date)).format('DD.MM.YYYY');
  }
  public state: ICategoryComponentState = {
  }

  public constructor(props: ICategoryComponentProps) {
    super(props);
  }

  public render() {
    const { classes } = this.props;
    return (
      <div className={classNames(this.props.className)}>
        <Grid container={true} direction='row'>
          <Typography
            variant='subtitle1'
            className={classNames(classes.displayInlineBlock, classes.width100)}
            noWrap={true}
            gutterBottom={true}
          >
            {this.props.header}
          </Typography>
        </Grid>
        <Grid container={true} spacing={24} >
          {this.props.categoryRepos.map((key: any, index: number) => (
            <Grid item={true} key={index} xl={3} lg={4} md={6} sm={6} xs={12} style={styles.width100}>
              <Card elevation={0} style={styles.card}>
                <CardContent>
                  <Grid container={true} spacing={8}>
                    <Grid item={true} xl={10} lg={10} md={10} sm={10} xs={10}>
                      <Typography
                        variant='h6'
                        className={classNames(classes.displayInlineBlock, classes.width100)}
                        noWrap={true}
                      >
                        {key.name}
                      </Typography>
                    </Grid>
                    <Grid item={true} xl={1} lg={1} md={1} sm={1} xs={1}>
                      {/* TODO: fix this */}
                      {this.props.organizations.indexOf(key.owner.login) !== -1 ?
                        <i className={classNames(classes.iconStyling, classes.textToRight, 'ai ai-corp')} aria-hidden='true' />
                        :
                        <i className={classNames(classes.iconStyling, classes.textToRight, 'ai ai-private')} aria-hidden='true' />
                      }
                    </Grid>
                    <Grid item={true} xl={1} lg={1} md={1} sm={1} xs={1}>
                      {key.permissions.push === false ?
                        <i className={classNames(classes.iconStyling, classes.textToRight, 'ai ai-read')} aria-hidden='true' />
                        :
                        <i className={classNames(classes.iconStyling, classes.textToRight, 'ai ai-write')} aria-hidden='true' />
                      }
                    </Grid>
                    <Grid item={true} className={classNames(classes.displayInlineBlock, classes.width100, classes.height)}>
                      <Typography variant='body1' gutterBottom={true}>
                        <Truncate lines={3} ellipsis={<span>...</span>}>
                          {key.description}
                        </Truncate>
                      </Typography>
                    </Grid>
                  </Grid>
                  <Grid container={true} spacing={0} direction='row'>
                    <Grid item={true} xl={6} lg={6} md={6} sm={6} xs={6}>
                      <Typography variant='subtitle2' className={classNames(classes.displayInlineBlock, classes.width100)} noWrap={true}>
                        {key.owner.full_name || key.owner.login}
                      </Typography>
                    </Grid>
                    <Grid item={true} xl={6} lg={6} md={6} sm={6} xs={6}>
                      <Typography variant='subtitle2' className={classNames(classes.displayInlineBlock, classes.width100, classes.textToRight)} noWrap={true}>
                        Endret: {this.formatDate(key.updated_at)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </div>
    );
  }
}

const mapStateToProps = (
  state: IDashboardAppState,
  props: ICategoryComponentProvidedProps,
): ICategoryComponentProps => {
  return {
    classes: props.classes,
    header: props.header,
    categoryRepos: props.categoryRepos,
    className: props.className,
    organizations: filterOnOrgName(state.dashboard.organizations),
  };
};

export default withStyles(styles)(connect(mapStateToProps)(CategoryComponent));