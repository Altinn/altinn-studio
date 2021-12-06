import { Grid } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import * as React from 'react';
import { ServiceCard } from './serviceCard';

export interface ICategoryComponentProvidedProps {
  classes: any;
  header: string;
  noServicesMessage: string;
  categoryRepos: any;
  className: string;
}

const styles = {
  mar_top_1em: {
    marginTop: '1em',
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
  },
};

class CategoryComponent extends React.Component<ICategoryComponentProvidedProps> {
  public renderServices() {
    const { classes, categoryRepos } = this.props;
    if (categoryRepos.length < 1) {
      return (
        <Grid container={true} direction='row'>
          <Typography
            className={classNames(
              classes.width100,
              classes.mar_top_1em,
              classes.fontSize_16,
            )}
            align='left'
          >
            {this.props.noServicesMessage}{' '}
            <a href='/repos/explore/repos/'>repos</a>.
          </Typography>
        </Grid>
      );
    }
    return (
      <Grid container={true} spacing={3}>
        {categoryRepos.map((service: any, index: number) => (
          <Grid
            item={true}
            key={index}
            xl={3}
            lg={4}
            md={6}
            sm={12}
            xs={12}
            className={classNames(classes.width100)}
          >
            <ServiceCard service={service} />
          </Grid>
        ))}
      </Grid>
    );
  }

  public render() {
    return (
      <div className={classNames(this.props.className)}>
        <Grid container={true} direction='row'>
          <Typography component='h2' variant='h2' gutterBottom={true}>
            {this.props.header}
          </Typography>
        </Grid>
        {this.renderServices()}
      </div>
    );
  }
}

export const ServicesCategory = withStyles(styles)(CategoryComponent);
