import { FormControl, InputAdornment, TextField, Button, Hidden } from '@material-ui/core';
import { Grid } from '@material-ui/core';
import Chip from '@material-ui/core/Chip';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import 'typeface-roboto';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import OrganizationCategory from './OrganizationCategory';
import withWidth, { isWidthUp } from '@material-ui/core/withWidth';

export interface IOrganizationOverviewComponentProvidedProps {
  classes: any;
  width: any;
}
export interface IOrganizationOverviewComponentProps extends IOrganizationOverviewComponentProvidedProps {
  language: any;
  services: any;
  allDistinctOwners: string[];
  selectedOwners: string[];
}

export interface IOrganizationOverviewComponentState {
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
  chip: {
    color: '#000000',
    border: '2px dotted #1EAEF7',
    backgroundColor: '#FFF',
    borderRadius: '36px',
    minHeight: '36px',
    fontSize: '16px',
    '&:hover': {
      backgroundColor: 'transparent !Important',
    },
    '&:focus': {
      backgroundColor: 'transparent !Important',
      border: '2px solid #1EAEF7',
    },
  },
  chipActive: {
    backgroundColor: 'rgba(30, 174, 247, 0.2) !Important',
    border: '2px solid #1EAEF7',
    borderRadius: '36px',
    minHeight: '36px',
    fontSize: '16px',
    '&:hover': {
      backgroundColor: 'rgba(30, 174, 247, 0.2) !Important',
    },
    '&:focus': {
      backgroundColor: 'rgba(30, 174, 247, 0.2) !Important',
    }
  },
  searchBox: {
    border: '2px solid #1EADF7',
    marginTop: '10px',
    marginBottom: '24px',
    background: 'none',
    width: '386px',
  },
  searchBoxInput: {
    fontSize: '16px',
    color: '#000000',
    padding: '6px',
  },
  searchBoxIcon: {
    color: '#000000',
    fontSize: '30px',
    marginRight: '10px',
    marginBottom: '5px',
  },
  arrow: {
    border: 'solid black',
    borderWidth: '0 3px 3px 0',
    display: 'inline-block',
    padding: '3px',
  },
  down: {
    borderTop: '10px solid black',
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    margin: '4px 8px 2px 0px',
  },
  dottedBtn: {
    minHeight: '60px',
    fontWeight: 700,
    width: '100%',
    color: '#000',
    textAlign: 'left' as 'left',
    verticalAlign: 'middle',
    backgroundColor: 'transparent',
    border: '2px dotted #1eaef7',
    boxShadow: 'none',
    borderRadius: '0px',
    textTransform: 'none' as 'none',
    maxWidth: '187px',
    justifyContent: 'right',
    fontSize: '16px',
    '&:hover': {
      backgroundColor: 'transparent !Important',
    },
    '&:focus': {
      backgroundColor: 'transparent !Important',
    },
  },
  dottedBtnIcon: {
    color: '#1EADF7',
    fontSize: '54px',
    paddingRight: '6px',
  },
};
const getListOfDistinctServiceOwners = (services: any) => {
  const allDistinctServiceOwners: string[] = [];
  services.map((key: any, index: number) => {
    if (allDistinctServiceOwners.indexOf(key.owner.login) === -1) {
      allDistinctServiceOwners.push(key.owner.login);
    }
  });
  return allDistinctServiceOwners;
};

class OrganizationOverviewComponent extends React.Component<IOrganizationOverviewComponentProps, IOrganizationOverviewComponentState> {
  public static getDerivedStateFromProps(_props: IOrganizationOverviewComponentProps, _state: IOrganizationOverviewComponentState) {
    return {
      selectedOwners: _props.selectedOwners,
    };
  }

  public state: IOrganizationOverviewComponentState = {
    selectedOwners: [],
    searchString: '',
  };

  public searchAndFilterServicesIntoCategoriesCategory(hasWriteRights: any) {
    const filteredServices = this.props.services
      .filter((key: any) =>
        key.permissions.push === hasWriteRights && this.state.selectedOwners.indexOf(key.owner.login) !== -1,
      );

    if (!this.state.searchString) {
      return filteredServices;
    }

    return filteredServices.filter((key: any) =>
      key.name.toLowerCase().includes(this.state.searchString.toLowerCase()) ||
      key.description.toLowerCase().includes(this.state.searchString.toLowerCase()),
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
    return (
      <Grid item={true} xl={10} lg={10} md={12}>
        {this.props.allDistinctOwners.map((key: string, index: number) => {
          //TODO: add so that username equals Dine tjenester
          return (<Chip
            key={index}
            label={key}
            clickable={true}
            color='primary'
            variant='outlined'
            onClick={this.updateListOfSelectedFilters.bind(this, key)}
            className={classNames(this.props.classes.chip, this.props.classes.mar_right_20, this.props.classes.mar_top_20, {
              [this.props.classes.chipActive]: this.state.selectedOwners.indexOf(key) === -1 ? false : true,
            })}
          />);
        })}
      </Grid>
    );
  }

  public renderSort() {
    return (
      <Grid item={true} xl={2} lg={2} md={2} sm={2} xs={2}>
        <Chip
          label={getLanguageFromKey('dashboard.sorte_services', this.props.language)}
          clickable={false}
          color='primary'
          variant='outlined'
          deleteIcon={<i className={classNames(this.props.classes.down)} />}
          onDelete={() => { return false }}
          className={classNames(this.props.classes.chip, this.props.classes.elementToRigth, this.props.classes.mar_top_20)}
        />
      </Grid>
    );
  }

  public render() {
    const { classes, services } = this.props;
    return (
      <div className={classNames(classes.mar_top_100, classes.mar_bot_50)}>
        <Grid container={true} direction='row'>
          <Grid item={true} xl={8} lg={8} md={8} sm={8} xs={12}>
            <Typography component='h3' variant='h3' gutterBottom={true}>
              {getLanguageFromKey('dashboard.main_header', this.props.language)}
            </Typography>
          </Grid>
          <Grid item={true} xl={4} lg={4} md={4} sm={4} xs={12} className={classes.textToRight}>
            <Button variant='contained' className={classes.dottedBtn} >
              <i className={classNames('ai ai-circle-plus', classes.dottedBtnIcon)} />
              {getLanguageFromKey('dashboard.new_service', this.props.language)}
            </Button>
          </Grid>
        </Grid>
        <Typography variant='h6' className={classes.mar_top_50} gutterBottom={true}>
          {getLanguageFromKey('dashboard.main_subheader', this.props.language)}
        </Typography>
        {services &&
          <>
            <Grid container={true} direction='row' className={classes.mar_top_50}>
              <Grid item={true} xl={12} lg={12} md={10} sm={10} xs={12} className={classNames({
                [classes.alignToCenter]: isWidthUp('lg', this.props.width)
              })}>
                <FormControl
                  classes={{ root: classNames(this.props.classes.searchBox) }}
                  fullWidth={true}
                >
                  <TextField
                    id={'service-search'}
                    placeholder={getLanguageFromKey('dashboard.search_service', this.props.language)}
                    onChange={this.updateSearchSting}
                    InputProps={{
                      disableUnderline: true,
                      startAdornment:
                        <InputAdornment position={'end'} classes={{ root: classNames(this.props.classes.searchBoxIcon) }}>
                          <i className={'ai ai-search'} />
                        </InputAdornment>,
                      classes: { root: classNames(this.props.classes.searchBoxInput) },
                    }}
                  />
                </FormControl>
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
            <OrganizationCategory
              header={getLanguageFromKey('dashboard.category_service_write', this.props.language)}
              className={classNames(classes.mar_top_50)}
              categoryRepos={this.searchAndFilterServicesIntoCategoriesCategory(true)}
            />
            <OrganizationCategory
              header={getLanguageFromKey('dashboard.category_service_read', this.props.language)}
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
  props: IOrganizationOverviewComponentProvidedProps,
): IOrganizationOverviewComponentProps => {
  return {
    classes: props.classes,
    width: props.width,
    language: state.language.language,
    services: state.dashboard.services,
    allDistinctOwners: getListOfDistinctServiceOwners(state.dashboard.services),
    selectedOwners: getListOfDistinctServiceOwners(state.dashboard.services),
  };
};

export default withWidth()(withStyles(styles)(connect(mapStateToProps)(OrganizationOverviewComponent)));