import Chip from '@material-ui/core/Chip';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import 'typeface-roboto';
import { Grid } from '@material-ui/core';
import { FormControl, InputAdornment, TextField } from '@material-ui/core';
import Category from './Category';
import { getLanguageFromKey } from '../../../shared/src/utils/language';

export interface IOrganizationOverviewComponentProvidedProps {
  classes: any;
}
export interface IOrganizationOverviewComponentProps extends IOrganizationOverviewComponentProvidedProps {
  language: any;
}

export interface IOrganizationOverviewComponentState {
  availableRepos: any;
  filteredOwners: string[];
  allAvailabeOwners: string[];
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
    marginBottom: '5px'
  },

};

class OrganizationOverviewComponent extends React.Component<IOrganizationOverviewComponentProps, IOrganizationOverviewComponentState> {
  public state: IOrganizationOverviewComponentState = {
    allAvailabeOwners: [],
    filteredOwners: [],
    availableRepos: {
      FirstRepo: {
        description: 'this is my first repo description',
        owner: 'testUser',
        last_Changed: '29.11.2018',
        rights: 'read',
        orgRepo: 'false',
      },
      SecondRepo: {
        description: 'this is my first repo description',
        owner: 'Patentstyret',
        last_Changed: '29.11.2018',
        rights: 'write',
        orgRepo: 'true',
      },
      ThirdRepo: {
        description: 'this is my first repo description',
        owner: 'Direktoratet for mineralforvaltning med Bergmesteren for Svalbard',
        last_Changed: '29.11.2018',
        rights: 'read',
        orgRepo: 'true',
      },
      ForthRepo: {
        description: 'this is my first repo description',
        owner: 'Patentstyret',
        last_Changed: '29.11.2018',
        rights: 'write',
        orgRepo: 'true',
      },
      FifthRepo: {
        description: 'this is my first repo description',
        owner: 'Patentstyret',
        last_Changed: '29.11.2018',
        rights: 'read',
        orgRepo: 'true',
      },
      SixthRepo: {
        description: 'this is my first repo description',
        owner: 'Patentstyret',
        last_Changed: '29.11.2018',
        rights: 'write',
        orgRepo: 'true',
      },
      SeventhRepo: {
        description: 'this is my first repo description',
        owner: 'Patentstyret',
        last_Changed: '29.11.2018',
        rights: 'read',
        orgRepo: 'true',
      },
      EigthRepo: {
        description: 'Culpa ground round turkey sunt ham hock non laborum aliquip incididunt meatloaf aliqua. Turducken culpa excepteur magna filet mignon nisi pork loin cupim.',
        owner: 'Patentstyret',
        last_Changed: '29.11.2018',
        rights: 'write',
        orgRepo: 'true',
      },
      NinthRepo: {
        description: 'Esse turducken in, jowl spare ribs sausage landjaeger short loin est. Ut cow in, pork chop bresaola shankle ut buffalo ball tip pork loin ipsum commodo pork shank. Swine do spare ribs sirloin. Sed boudin alcatra nisi, cow prosciutto leberkas irure fatback salami meatloaf pork loin aute.',
        owner: 'Patentstyret',
        last_Changed: '29.11.2018',
        rights: 'read',
        orgRepo: 'true',
      },
      TenthRepo: {
        description: 'Spicy jalapeno bacon ipsum dolor amet bacon pork chop ham hock jowl andouille strip steak nulla doner chuck alcatra eiusmod ut id hamburger kielbasa. Duis ground round ut ham hock cupim pork chop, dolore sed beef quis tongue porchetta boudin meatloaf. Consequat flank short loin, corned beef pork officia commodo. ',
        owner: 'Patentstyret',
        last_Changed: '29.11.2018',
        rights: 'write',
        orgRepo: 'true',
      },
      EleventhRepo: {
        description: 'this is my first repo description',
        owner: 'Patentstyret',
        last_Changed: '29.11.2018',
        rights: 'read',
        orgRepo: 'true',
      },
      LongRepoNameThatWillBreakTheWholeThing: {
        description: 'this is my first repo description',
        owner: 'Patentstyret',
        last_Changed: '29.11.2018',
        rights: 'read',
        orgRepo: 'true',
      }
    }
  }

  public componentDidMount() {
    if (this.state.filteredOwners.length === 0 && this.state.allAvailabeOwners.length === 0) {
      this.setState({
        filteredOwners: this.getDistinctOwners(),
      });
      this.setState({
        allAvailabeOwners: this.getDistinctOwners(),
      });
    }
  }

  public getDistinctOwners() {
    const uniqOrg: string[] = [];
    Object.keys(this.state.availableRepos).map((key: string) => {
      if (uniqOrg.indexOf(this.state.availableRepos[key].owner) === -1) {
        uniqOrg.push(this.state.availableRepos[key].owner);
      }
    });
    return uniqOrg;
  }

  public filterCategory(filter: string) {
    const newObj = Object.keys(this.state.availableRepos)
      .filter((key: any) => this.state.availableRepos[key].rights === filter)
      .reduce((obj: any, key: any) => {
        obj[key] = this.state.availableRepos[key];
        return obj;
      }, {});
    return newObj;
  }

  public updateFilter(key: string) {
    const index = this.state.filteredOwners.indexOf(key);
    this.setState((state: any) => {
      if (index > -1) {
        state.filteredOwners.splice(index, 1);
      } else {
        state.filteredOwners.push(key);
      }
      return {
        filteredOwners: state.filteredOwners,
      };
    });
  }

  public render() {
    let { classes } = this.props;
    return (
      <div className={classNames(classes.mar_top_100, classes.mar_bot_50)}>
        <Typography component='h3' variant='h3' gutterBottom={true}> {getLanguageFromKey('dashboard.main_header', this.props.language)}</Typography>
        <Typography variant='h6' className={classes.mar_top_50} gutterBottom={true}>
          {getLanguageFromKey('dashboard.main_subheader', this.props.language)}
        </Typography>
        <Grid container={true} direction='row' justify='center' alignItems='center' className={classes.mar_top_50}>
          <FormControl
            classes={{ root: classNames(this.props.classes.searchBox) }}
            fullWidth={true}
          >
            <TextField
              id={'service-search'}
              placeholder={getLanguageFromKey('dashboard.search_service', this.props.language)}
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
        <Grid container={true} direction='row' className={classes.mar_top_50}>
          {this.state.allAvailabeOwners.map((key: string, index: number) => {
            //TODO: add so that username equals Dine tjenester
            return (<Chip
              key={index}
              label={key}
              clickable={true}
              color='primary'
              variant='outlined'
              onClick={this.updateFilter.bind(this, key)}
              className={classNames(classes.chip, classes.mar_right_20, {
                [classes.chipActive]: this.state.filteredOwners.indexOf(key) === -1 ? false : true,
              })}
            />);
          })}
        </Grid>
        <Category header={getLanguageFromKey('dashboard.category_service_write', this.props.language)} className={classNames(classes.mar_top_50)} categoryRepos={this.filterCategory('write')} />
        <Category header={getLanguageFromKey('dashboard.category_service_read', this.props.language)} className={classNames(classes.mar_top_100)} categoryRepos={this.filterCategory('read')} />
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
    language: state.language.language,
  };
};
export default withStyles(styles)(connect(mapStateToProps)(OrganizationOverviewComponent));
