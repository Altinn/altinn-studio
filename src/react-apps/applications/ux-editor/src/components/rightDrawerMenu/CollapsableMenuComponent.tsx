import { createStyles, List, ListItem, ListItemIcon, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnCheckBox from '../../../../shared/src/components/AltinnCheckBox';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';

const styles = createStyles({
  collapseHeader: {
    margin: '0 !important',
    padding: '0 !important',
  },
  icon: {
    padding: '0 0.6rem',
    width: '2.5rem !important',
    fontSize: '3rem',
  },
  link: {
    textDecoration: 'underline',
    textDecorationColor: altinnTheme.altinnPalette.primary.blueDark,
    cursor: 'pointer',
  },
  list: {
    padding: 0,
  },
  listItemHeader: {
    padding: '1.2rem 0',
    borderTop: '1px solid ' + altinnTheme.altinnPalette.primary.greyMedium,
  },
  listItem: {
    width: '100%',
    color: altinnTheme.altinnPalette.primary.blueDarker,
    fontSize: '1.6rem',
  },
  rotateDown: {
    transform: 'rotate(90deg)',
    fontSize: '1.3rem',
    margin: '0 !important',
    cursor: 'pointer',
  },
  rotateRight: {
    fontSize: '1.3rem',
    margin: '0 !important',
    cursor: 'pointer',
  },
});
export interface ICollapsableMenuProvidedProps {
  classes: any;
  header: string;
  componentId: string;
  listItems: ICollapsableMenuListItem[];
}

export interface ICollapsableMenuProps extends ICollapsableMenuProvidedProps {
  components: any;
  language: any;
}

export interface ICollapsableMenuState {
  menuIsOpen: boolean;
}

export interface ICollapsableMenuListItem {
  name: string;
  action?: () => void;
}

class CollapsableMenu extends React.Component<ICollapsableMenuProps, ICollapsableMenuState> {
  constructor(_props: ICollapsableMenuProps) {
    super(_props);
    this.state = {
      menuIsOpen: true,
    };
  }

  public toggleCheckbox = () => {
    console.log('hello');
  }

  public toggleMenu = () => {
    this.setState({
      menuIsOpen: !this.state.menuIsOpen,
    });
  }
  public handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      this.toggleMenu();
    }
  }
  public render(): JSX.Element {
    const component = this.props.components[this.props.componentId];
    console.log(component);
    return (
      <List className={this.props.classes.list}>
        <ListItem
          className={this.props.classes.listItem + ' ' + this.props.classes.listItemHeader}
        >
          <ListItemIcon
            className={this.state.menuIsOpen ? this.props.classes.rotateDown : this.props.classes.rotateRight}
            onClick={this.toggleMenu}
            tabIndex={0}
            onKeyPress={this.handleKeyPress}
          >
            <i className={'ai ai-expand ' + this.props.classes.icon} />
          </ListItemIcon>
          <span className={this.props.classes.collapseHeader}>{this.props.header}</span>
        </ListItem>
        {(component && this.props.header === this.props.language.ux_editor.service_logic_validations) &&
          <ListItem className={this.props.classes.listItem}>
            <AltinnCheckBox
              checked={component.readOnly}
              onChangeFunction={this.toggleCheckbox}
            />
            Hello
          </ListItem>
        }
        {this.state.menuIsOpen && typeof (this.props.listItems[0].name) !== 'undefined'
          && this.props.listItems.map((item, index) => {
            return (
              <div key={item.name}>
                <ListItem className={this.props.classes.listItem}>
                  <span
                    className={this.props.classes.link}
                    onClick={item.action}
                  >
                    {item.name}
                  </span>
                </ListItem>
                {this.props.children}
              </div>
            );
          })
        }
      </List>
    );
  }
}

const mapStateToProps: (
  state: IAppState,
  props: ICollapsableMenuProvidedProps,
) => ICollapsableMenuProps = (state: IAppState, props: ICollapsableMenuProvidedProps) => ({
  classes: props.classes,
  componentId: props.componentId,
  components: state.formDesigner.layout.components,
  header: props.header,
  language: state.appData.language.language,
  listItems: props.listItems,
});

export const CollapsableMenuComponent =
  withStyles(styles, { withTheme: true })(connect(mapStateToProps)(CollapsableMenu));
