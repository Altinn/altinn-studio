import {
  createStyles,
  Divider,
  FormControl,
  InputAdornment,
  Popover,
  TextField,
  Theme,
  Typography,
  withStyles,
} from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import { ComponentTypes } from '..';
import { getComponentHelperTextByComponentType, getComponentTitleByComponentType } from '../../utils/language';

export interface IInformationPanelProvidedProps {
  classes: any;
  anchorElement: any;
  selectedComponent: ComponentTypes;
  informationPanelOpen: boolean;
  onClose: any;
  thirdPartyLibrary?: boolean;
}

export interface IInformationPanelProps extends IInformationPanelProvidedProps {
  language: any;
}

class InformationPanel extends React.Component<IInformationPanelProps> {
  public render(): JSX.Element {
    return (
      <Popover
        anchorEl={this.props.anchorElement}
        open={this.props.informationPanelOpen}
        onClose={this.props.onClose}
        PaperProps={{ square: true }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        classes={{ paper: classNames(this.props.classes.informationPanel) }}
      >
        <FormControl
          classes={{ root: classNames(this.props.classes.searchBox) }}
          fullWidth={false}
        >
          <TextField
            id={'component-search'}
            placeholder={'Søk'}
            InputProps={{
              disableUnderline: true,
              endAdornment:
                <InputAdornment
                  position={'end'}
                  classes={{ root: classNames(this.props.classes.searchBoxIcon) }}
                >
                  <i className={'fa fa-search'} />
                </InputAdornment>,
              classes: { root: classNames(this.props.classes.searchBoxInput) },
            }}
          />
        </FormControl>
        <Divider classes={{ root: classNames(this.props.classes.informationPanelDivider) }} />
        <Typography classes={{ root: classNames(this.props.classes.informationPanelHeader) }}>
          {getComponentTitleByComponentType(this.props.selectedComponent, this.props.language)}
        </Typography>
        <Typography classes={{ root: classNames(this.props.classes.informationPanelText) }}>
          {getComponentHelperTextByComponentType(
            this.props.selectedComponent,
            this.props.language,
          )}
        </Typography>
        <Typography classes={{ root: classNames(this.props.classes.informationPanelText) }}>
          <svg
            style={{ verticalAlign: 'middle', lineHeight: 'inherit', position: 'relative', paddingRight: '6px' }}
            width='26px'
            height='20px'
            viewBox='0 0 20 20'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path d='M10 0C4.5 0 0 4.5 0 10C0 15.5 4.5 20 10 20C15.5 20 20 15.5 20 10C20 4.5 15.5 0 10 0ZM9.58333 2.91667C10.25 2.91667 10.8333 3.5 10.8333 4.16667C10.8333 4.83333 10.25 5.41667 9.58333 5.41667C8.91667 5.41667 8.33333 4.83333 8.33333 4.16667C8.33333 3.5 8.91667 2.91667 9.58333 2.91667ZM13.3333 15.4167H7.5V13.75H9.58333V8.75H7.91667V7.08333H11.25V13.75H13.3333V15.4167Z' fill='#17C96B' />
          </svg>
          {(!this.props.thirdPartyLibrary) ?
            this.props.language.ux_editor.information_altinn_library :
            this.props.language.ux_editor.information_third_party_library
          }
        </Typography>
        <Typography classes={{ root: classNames(this.props.classes.informationPanelLink) }}>
          <a
            href='https://docs.altinn.studio/teknologi/altinnstudio/solutions/altinn-studio/functional/build-app/ui-designer/components/'
            target='_blank'
            rel='noopener noreferrer'
          >
            {this.props.language.ux_editor.information_more_info_link}
          </a>
        </Typography>
      </Popover>
    );
  }
}

const styles = (theme: Theme) => createStyles({
  searchBox: {
    border: '1px solid #0062BA',
    marginBottom: '12px',
    background: 'none',
  },
  searchBoxInput: {
    fontSize: '14px',
    color: '#6A6A6A',
    padding: '6px',
  },
  searchBoxIcon: {
    color: '#000000',
  },
  listItemIcon: {
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  informationPanel: {
    padding: '24px',
    width: '445px',
    height: 'auto',
    backgroundColor: '#FFFFFF',
  },
  informationPanelDivider: {
    marginLeft: '-24px',
    marginRight: '-24px',
    marginBottom: '12px',
  },
  informationPanelHeader: {
    fontSize: '14px',
    fontWeight: 'bold',
    fontStyle: 'medium',
    marginBottom: '6px',
  },
  informationPanelText: {
    fontSize: '14px',
    marginBottom: '12px',
  },
  informationPanelLink: {
    fontSize: '14px',
  },
});

const mapStateToProps: (
  state: IAppState,
  props: IInformationPanelProvidedProps,
) => IInformationPanelProps = (state: IAppState, props: IInformationPanelProvidedProps) => ({
  language: state.appData.languageState.language,
  anchorElement: props.anchorElement,
  selectedComponent: props.selectedComponent,
  informationPanelOpen: props.informationPanelOpen,
  onClose: props.onClose,
  classes: props.classes,
});

export const InformationPanelComponent =
  withStyles(styles, { withTheme: true })(connect(mapStateToProps)(InformationPanel));
