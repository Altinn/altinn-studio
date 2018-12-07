import { Grid } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import 'typeface-roboto';
import ServiceCard from './serviceCard';

export interface ICategoryComponentProvidedProps {
  classes: any;
  header: string;
  noServicesMessage: string;
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

  width100: {
    width: '100%',
  },
};

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
  public state: ICategoryComponentState = {
  };

  public constructor(props: ICategoryComponentProps) {
    super(props);
  }

  public renderServices() {
    if (this.props.categoryRepos.length < 1) {
      return (
        <Grid container={true} direction='row'>
          <Typography variant='h4' className={classNames(this.props.classes.width100, this.props.classes.mar_top_100)} align='center'>
            {this.props.noServicesMessage}
          </Typography>
        </Grid>
      );
    } else {
      return (
        <Grid container={true} spacing={24} >
          {this.props.categoryRepos.map((service: any, index: number) => (
            <Grid item={true} key={index} xl={3} lg={4} md={6} sm={12} xs={12} style={styles.width100}>
              <ServiceCard
                service={service}
              />
            </Grid>
          ))}
        </Grid>
      );
    }
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
        {this.renderServices()}
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
    noServicesMessage: props.noServicesMessage,
    categoryRepos: props.categoryRepos,
    className: props.className,
    organizations: filterOnOrgName(state.dashboard.organizations),
  };
};

export default withStyles(styles)(connect(mapStateToProps)(CategoryComponent));