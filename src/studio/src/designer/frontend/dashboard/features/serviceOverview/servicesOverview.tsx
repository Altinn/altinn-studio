/* eslint-disable consistent-return */
/* eslint-disable array-callback-return */
/* eslint-disable no-underscore-dangle */
import { Grid } from '@material-ui/core';
import { createStyles, withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import withWidth, { isWidthUp } from '@material-ui/core/withWidth';
import classNames from 'classnames';
// import * as DOMPurify from 'dompurify';
// import * as marked from 'marked';
import * as React from 'react';
// import ReactHtmlParser from 'react-html-parser';
import { connect } from 'react-redux';
// import AltinnInformationPaper from 'app-shared/components/AltinnInformationPaper';
// import AltinnLink from 'app-shared/components/AltinnLink';
import AltinnSearchInput from 'app-shared/components/AltinnSearchInput';
import { getLanguageFromKey } from 'app-shared/utils/language';
// import { get } from 'app-shared/utils/networking';
import { CreateNewService } from '../createService/createNewService';
import { ServicesCategory } from './servicesCategory';

export interface IServicesOverviewComponentProvidedProps {
  classes: any;
  width: any;
}
export interface IServicesOverviewComponentProps extends IServicesOverviewComponentProvidedProps {
  language: any;
  services: any[];
  allDistinctOwners: string[];
  selectedOwners: string[];
  currentUserName: string;
}

export interface IServicesOverviewComponentState {
  selectedOwners: string[];
  searchString: string;
  // majorIssues: JSX.Element[];
}

const styles = createStyles({
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
  },
  paperList: {
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 16,
  },
  font_16: {
    fontSize: 16,
  },
  mar_top_13: {
    marginTop: 13,
  },
});

const getListOfDistinctServiceOwners = (services: any, currentUser?: string) => {
  const allDistinctServiceOwners: string[] = [];
  if (services) {
    // eslint-disable-next-line array-callback-return
    services.map((service: any) => {
      const keyToLookFor = service.owner.full_name || service.owner.login;
      if (allDistinctServiceOwners.indexOf(keyToLookFor) === -1) {
        if (currentUser === keyToLookFor) {
          return;
        }
        allDistinctServiceOwners.push(keyToLookFor);
      }
    });
  }
  if (currentUser) {
    allDistinctServiceOwners.unshift(currentUser);
  }

  return allDistinctServiceOwners;
};

export const getListOfServicesExcludingCodelist = (services: any) => {
  if (services) {
    return services.filter((service: any) => service.name !== 'codelists');
  }
  return services;
};

const getCurrentUsersName = (user: any) => {
  return user ? user.full_name || user.login : '';
};

// eslint-disable-next-line max-len
export class ServicesOverviewComponent extends React.Component<IServicesOverviewComponentProps, IServicesOverviewComponentState> {
  // eslint-disable-next-line max-len
  public static getDerivedStateFromProps(_props: IServicesOverviewComponentProps) {
    return {
      selectedOwners: _props.selectedOwners,
    };
  }

  public _isMounted = false;

  // eslint-disable-next-line react/state-in-constructor
  public state: IServicesOverviewComponentState = {
    selectedOwners: [],
    searchString: '',
    // majorIssues: null,
  };

  public componentDidMount() {
    this._isMounted = true;
  }

  public componentWillUnmount() {
    this._isMounted = false;
  }

  public updateSearchString = (event: any) => {
    this.setState({
      searchString: event.target.value,
    });
  }

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

    return filteredServices.filter((service: any) => {
      const searchFor = this.state.searchString.toLowerCase();
      if (service.name.toLowerCase().indexOf(searchFor) > -1) return service;
      if (service.owner.login.toLowerCase().indexOf(searchFor) > -1) return service;
      if (service.owner.full_name.toLowerCase().indexOf(searchFor) > -1) return service;
      if (service.description.toLowerCase().indexOf(searchFor) > -1) return service;
    });
  }

  public render() {
    const {
      classes, services, currentUserName,
    } = this.props;
    return (
      <div className={classNames(classes.mar_top_100, classes.mar_bot_50)}>
        <Grid container={true} direction='row'>
          <Grid
            item={true} xl={8}
            lg={8} md={8}
            sm={12} xs={12}
          >
            <Typography
              component='h1' variant='h1'
              gutterBottom={true}
            >
              {getLanguageFromKey('dashboard.main_header', this.props.language)}
            </Typography>
          </Grid>
          {currentUserName &&
            <Grid
              item={true}
              xl={4}
              lg={4}
              md={4}
              sm={12}
              xs={12}
              className={classNames({ [classes.textToRight]: isWidthUp('md', this.props.width) })}
            >
              <CreateNewService />
            </Grid>
          }
        </Grid>
        {services &&
          <>
            <Grid
              container={true} direction='row'
              className={classes.mar_top_13}
            >
              <Grid
                item={true}
                xl={12}
                lg={12}
                md={12}
                sm={12}
                xs={12}
                className={classNames({
                  [classes.alignToCenter]: isWidthUp('md', this.props.width),
                })}
              >
                <AltinnSearchInput
                  id='service-search'
                  ariaLabel={getLanguageFromKey('dashboard.search_service', this.props.language)}
                  placeholder={getLanguageFromKey('dashboard.search_service', this.props.language)}
                  onChangeFunction={this.updateSearchString}
                />
              </Grid>
            </Grid>
            <ServicesCategory
              header={getLanguageFromKey('dashboard.category_service_write', this.props.language)}
              noServicesMessage={getLanguageFromKey('dashboard.no_category_service_write', this.props.language)}
              className={classNames(classes.mar_top_13)}
              categoryRepos={this.searchAndFilterServicesIntoCategoriesCategory(true)}
            />
            <ServicesCategory
              header={getLanguageFromKey('dashboard.category_service_read', this.props.language)}
              noServicesMessage={getLanguageFromKey('dashboard.no_category_service_read', this.props.language)}
              className={classNames(classes.mar_top_50)}
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
    services: getListOfServicesExcludingCodelist(state.dashboard.services),
    // eslint-disable-next-line max-len
    allDistinctOwners: getListOfDistinctServiceOwners(state.dashboard.services, getCurrentUsersName(state.dashboard.user)),
    selectedOwners: getListOfDistinctServiceOwners(state.dashboard.services),
    currentUserName: getCurrentUsersName(state.dashboard.user),
  };
};

export const ServicesOverview = withWidth()(withStyles(styles)(connect(mapStateToProps)(ServicesOverviewComponent)));
