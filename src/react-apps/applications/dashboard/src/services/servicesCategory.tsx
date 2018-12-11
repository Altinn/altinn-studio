import { Grid } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import * as React from 'react';
import ServiceCard from './serviceCard';

export interface ICategoryComponentProvidedProps {
  classes: any;
  header: string;
  noServicesMessage: string;
  categoryRepos: any;
  className: string;
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
  fontSize_24: {
    fontSize: '24px',
  },
  fontSize_16: {
    fontSize: '16px',
  }
};

class CategoryComponent extends React.Component<ICategoryComponentProvidedProps, ICategoryComponentState> {
  public renderServices() {
    const { classes, categoryRepos } = this.props;
    if (categoryRepos.length < 1) {
      return (
        <Grid container={true} direction='row'>
          <Typography className={classNames(classes.width100, classes.mar_top_100, classes.fontSize_24)} align='center'>
            {this.props.noServicesMessage}
          </Typography>
        </Grid>
      );
    } else {
      return (
        <Grid container={true} spacing={24} >
          {categoryRepos.map((service: any, index: number) => (
            <Grid item={true} key={index} xl={3} lg={4} md={6} sm={12} xs={12} className={classNames(classes.width100)}>
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
            className={classNames(classes.displayInlineBlock, classes.width100, classes.fontSize_16)}
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

export default withStyles(styles)(CategoryComponent);