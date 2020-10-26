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
import { Link } from 'react-router-dom';
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
  language: state.appData.language.language,
  anchorElement: props.anchorElement,
  selectedComponent: props.selectedComponent,
  informationPanelOpen: props.informationPanelOpen,
  onClose: props.onClose,
  classes: props.classes,
});

export const InformationPanelComponent =
  withStyles(styles, { withTheme: true })(connect(mapStateToProps)(InformationPanel));
