import { Hidden } from '@material-ui/core';
import { Grid } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import withWidth, { isWidthUp } from '@material-ui/core/withWidth';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnFilterChip from '../../../shared/src/components/AltinnFilterChip';
import AltinnIconButton from '../../../shared/src/components/AltinnIconButton';
import AltinnSearchInput from '../../../shared/src/components/AltinnSearchInput';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import ServicesCategory from './servicesCategory';

export interface IServicesOverviewComponentProvidedProps {
  classes: any;
  width: any;
}
export interface IServicesOverviewComponentProps extends IServicesOverviewComponentProvidedProps {
  language: any;
  services: any;
  allDistinctOwners: string[];
  selectedOwners: string[];
  currentUserName: string;
}

export interface IServicesOverviewComponentState {
  selectedOwners: string[];
  searchString: string;
}

const styles = {
  mar_top_100: {
    marginTop: '100px',
  },
  mar_top_50: {
    marginTop: '50px',
  },
  mar_bot_50: {
    marginBottom: '50px',
  },
  mar_right_20: {
    marginRight: '20px',
  },
  mar_top_20: {
    marginTop: '20px',
  },
  textToRight: {
    textAlign: 'right' as 'right',
  },
  alignToCenter: {
    textAlign: 'center' as 'center',
  },
  elementToRigth: {
    float: 'right' as 'right',
  },
  textSyle: {
    fontSize: '18px',
    fontWeight: 500,
  }
};
const getListOfDistinctServiceOwners = (services: any, currentUser?: string) => {
  const allDistinctServiceOwners: string[] = [];
  services.map((service: any) => {
    const keyToLookFor = service.owner.full_name || service.owner.login;
    if (allDistinctServiceOwners.indexOf(keyToLookFor) === -1) {
      if (currentUser && currentUser === keyToLookFor) {
        return;
      }
      allDistinctServiceOwners.push(keyToLookFor);
    }
  });
  if (currentUser) allDistinctServiceOwners.unshift(currentUser)
  return allDistinctServiceOwners;
};

const getCurrentUsersName = (user: any) => {
  return user.full_name || user.login;
};

class ServicesOverviewComponent extends React.Component<IServicesOverviewComponentProps, IServicesOverviewComponentState> {
  public static getDerivedStateFromProps(_props: IServicesOverviewComponentProps, _state: IServicesOverviewComponentState) {
    return {
      selectedOwners: _props.selectedOwners,
    };
  }

  public state: IServicesOverviewComponentState = {
    selectedOwners: [],
    searchString: '',
  };

  public searchAndFilterServicesIntoCategoriesCategory(hasWriteRights: any) {
    const filteredServices = this.props.services
      .filter((service: any) => {
        const keyToLookFor = service.owner.full_name || service.owner.login;
        if (service.permissions.push === hasWriteRights && this.state.selectedOwners.indexOf(keyToLookFor) !== -1) {
          return service;
        }
      });

    if (!this.state.searchString) {
      return filteredServices;
    }

    return filteredServices.filter((service: any) =>
      service.name.toLowerCase().includes(this.state.searchString.toLowerCase()) ||
      service.description.toLowerCase().includes(this.state.searchString.toLowerCase()),
    );
  }

  public updateListOfSelectedFilters(key: string) {
    const index = this.state.selectedOwners.indexOf(key);
    this.setState((state: any) => {
      if (index > -1) {
        state.selectedOwners.splice(index, 1);
      } else {
        state.selectedOwners.push(key);
      }
      return {
        selectedOwners: state.selectedOwners,
      };
    });
  }

  public updateSearchSting = (event: any) => {
    this.setState({
      searchString: event.target.value,
    });
  }

  public renderFilters() {
    const { classes } = this.props;
    return (
      <Grid item={true} xl={10} lg={10} md={12}>
        {this.props.allDistinctOwners.map((key: string, index: number) => {
          return (
            <AltinnFilterChip
              key={index}
              className={classNames(
                classes.chip,
                classes.mar_right_20,
                classes.mar_top_20)}
              label={key}
              onclickFunction={this.updateListOfSelectedFilters.bind(this, key)}
              active={this.state.selectedOwners.indexOf(key) !== -1}
            />);
        })}
      </Grid>
    );
  }

  public renderSort() {
    const { classes } = this.props;
    return (
      <Grid item={true} xl={2} lg={2} md={2} sm={2} xs={12}>
        <AltinnFilterChip
          key={getLanguageFromKey('dashboard.sorte_services', this.props.language)}
          className={classNames(
            classes.mar_top_20,
            { [classes.elementToRigth]: isWidthUp('sm', this.props.width) })}
          label={getLanguageFromKey('dashboard.sorte_services', this.props.language)}
          onDeleteFunction={() => { return false }}
          sortIcon={true}
          active={false}
        />
      </Grid>
    );
  }

  public render() {
    const { classes, services } = this.props;
    return (
      <div className={classNames(classes.mar_top_100, classes.mar_bot_50)}>
        <Grid container={true} direction='row'>
          <Grid item={true} xl={8} lg={8} md={8} sm={12} xs={12}>
            <Typography component='h1' variant='h1' gutterBottom={true}>
              {getLanguageFromKey('dashboard.main_header', this.props.language)}
            </Typography>
          </Grid>
          <Grid
            item={true}
            xl={4} lg={4} md={4} sm={12} xs={12}
            className={classNames({ [classes.textToRight]: isWidthUp('md', this.props.width) })}
          >
            <AltinnIconButton
              btnText={getLanguageFromKey('dashboard.new_service', this.props.language)}
              iconClass='ai ai-circle-plus'
            />
          </Grid>
        </Grid>
        <Typography className={classNames(classes.mar_top_50, classes.textSyle)} gutterBottom={true}>
          {getLanguageFromKey('dashboard.main_subheader', this.props.language)}
        </Typography>
        {services &&
          <>
            <Grid container={true} direction='row' className={classes.mar_top_50}>
              <Grid
                item={true}
                xl={12} lg={12} md={10} sm={10} xs={12}
                className={classNames({
                  [classes.alignToCenter]: isWidthUp('lg', this.props.width),
                })}
              >
                <AltinnSearchInput
                  id={'service-search'}
                  placeholder={getLanguageFromKey('dashboard.search_service', this.props.language)}
                  onChangeFunction={this.updateSearchSting}
                />
              </Grid>
              <Hidden lgUp={true}>
                {this.renderSort()}
                {this.renderFilters()}
              </Hidden>
              <Hidden mdDown={true}>
                {this.renderFilters()}
                {this.renderSort()}
              </Hidden>
            </Grid>
            <ServicesCategory
              header={getLanguageFromKey('dashboard.category_service_write', this.props.language)}
              noServicesMessage={getLanguageFromKey('dashboard.no_category_service_write', this.props.language)}
              className={classNames(classes.mar_top_50)}
              categoryRepos={this.searchAndFilterServicesIntoCategoriesCategory(true)}
            />
            <ServicesCategory
              header={getLanguageFromKey('dashboard.category_service_read', this.props.language)}
              noServicesMessage={getLanguageFromKey('dashboard.no_category_service_read', this.props.language)}
              className={classNames(classes.mar_top_100)}
              categoryRepos={this.searchAndFilterServicesIntoCategoriesCategory(false)}
            />
          </>
        }
      </div>
    );
  }
}

const mapStateToProps = (
  state: IDashboardAppState,
  props: IServicesOverviewComponentProvidedProps,
): IServicesOverviewComponentProps => {
  return {
    classes: props.classes,
    width: props.width,
    language: state.language.language,
    services: state.dashboard.services,
    allDistinctOwners: getListOfDistinctServiceOwners(state.dashboard.services, getCurrentUsersName(state.dashboard.user)),
    selectedOwners: getListOfDistinctServiceOwners(state.dashboard.services),
    currentUserName: getCurrentUsersName(state.dashboard.user),
  };
};

export default withWidth()(withStyles(styles)(connect(mapStateToProps)(ServicesOverviewComponent)));