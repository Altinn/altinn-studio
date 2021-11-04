/* eslint-disable no-underscore-dangle */
import { Typography } from '@material-ui/core';
import { createTheme, createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import ReactHtmlParser from 'react-html-parser';
import { connect } from 'react-redux';
import AltinnBreadcrumb from 'app-shared/components/AltinnBreadcrumb';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { get } from 'app-shared/utils/networking';
import DOMPurify = require('dompurify');
import marked = require('marked');

export interface IKnownIssuesComponentProvidedProps {
  classes: any;
}

export interface IKnownIssuesComponentProps extends IKnownIssuesComponentProvidedProps {
  language: any;
}

export interface IKnownIssuesComponentState {
  knownIssues: any;
}

const theme = createTheme(altinnTheme);

const styles = createStyles({
  mainStyle: {
    marginLeft: 120,
    marginTop: '50px',
    [theme.breakpoints.down('md')]: {
      marginLeft: '50px',
      marginRight: '50px',
    },
    marginBottom: 50,
  },
  breadCrumb: {
    marginTop: 24,
    marginLeft: 66,
    fontSize: 16,
    overflowWrap: 'break-word' as 'break-word',
    [theme.breakpoints.down('md')]: {
      marginLeft: '50px',
      marginRight: '50px',
    },
  },
  knownIssues: {
    marginLeft: '-3rem',
    maxWidth: 900,
  },
});

export class KnownIssuesComponent extends React.Component<IKnownIssuesComponentProps, IKnownIssuesComponentState> {
  // eslint-disable-next-line react/state-in-constructor
  public state: IKnownIssuesComponentState = {
    knownIssues: null,
  };

  public componentDidMount() {
    this.componentMounted = true;
    get('https://raw.githubusercontent.com/Altinn/altinn-studio/master/KNOWNISSUES.md')
      .then((res) => {
        if (this.componentMounted) {
          marked.setOptions({
            headerIds: false,
          });
          const unsafeHTML = marked(res);
          const safeHTML = DOMPurify.sanitize(unsafeHTML,
            {
              ALLOWED_TAGS: ['ul', 'li', 'a', 'p', 'h2'],
              ALLOWED_ATTR: ['href', 'target'],
            });
          const doc = new DOMParser().parseFromString(safeHTML, 'text/html');
          const knownIssues = ReactHtmlParser(doc.getElementsByTagName('body')[0].innerHTML);

          this.setState({
            knownIssues,
          });
        }
      });
  }

  public componentWillUnmount() {
    this.componentMounted = false;
  }

  public componentMounted = false;

  public render() {
    const { classes } = this.props;
    return (
      <>
        <AltinnBreadcrumb
          className={classes.breadCrumb}
          firstLink={`${window.location.origin}/`}
          firstLinkTxt={getLanguageFromKey('dashboard.main_header', this.props.language)}
          secondLinkTxt={getLanguageFromKey('dashboard.known_issues_header', this.props.language)}
        />
        <div className={classes.mainStyle}>
          <Typography
            component='h1' variant='h1'
            gutterBottom={true} className={classes.serviceHeader}
          >
            {getLanguageFromKey('dashboard.known_issues_header', this.props.language)}
          </Typography>
          {this.state.knownIssues ?
            <div className={classes.knownIssues}>{this.state.knownIssues}</div>
            :
            <div>
              <AltinnSpinner
                spinnerText={getLanguageFromKey('dashboard.known_issues_loading_text', this.props.language)}
              />
            </div>
          }
        </div>
      </>
    );
  }
}

const mapStateToProps = (
  state: IDashboardAppState,
  props: IKnownIssuesComponentProvidedProps,
): IKnownIssuesComponentProps => {
  return {
    classes: props.classes,
    language: state.language.language,
  };
};

export const KnownIssues = withStyles(styles)(connect(mapStateToProps)(KnownIssuesComponent));
