import { createStyles, List, ListItem, ListItemIcon, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnCheckBox from '../../../../shared/src/components/AltinnCheckBox';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';

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
  children?: any;
  classes: any;
  header: string;
  componentId: string;
  listItems: ICollapsableMenuListItem[];
}

export interface ICollapsableMenuProps extends ICollapsableMenuProvidedProps {
  components: IFormDesignerComponentProps;
  language: any;
  dataModel: IDataModelFieldElement[];
}

export interface ICollapsableMenuListItem {
  name: string;
  action?: any;
}

const CollapsibleMenus = (props: ICollapsableMenuProps) => {
  const [menuIsOpen, setMenuIsOpen] = React.useState(true);
  const [component, setComponent] = React.useState(props.components[props.componentId]);
  const { classes } = props;

  React.useEffect(() => {
    setComponent(props.components[props.componentId]);
  }, [props]);

  const getMinOccursFromDataModel = (dataBindingName: string): boolean => {
    if (dataBindingName) {
      const element: IDataModelFieldElement = props.dataModel.find((e: IDataModelFieldElement) =>
        e.DataBindingName === dataBindingName);
      return element ? element.MinOccurs === 1 : false;
    }
    return false;
  };

  const toggleMenu = () => {
    setMenuIsOpen(!menuIsOpen);
  };

  const toggleCheckbox = (value: string) => () => {
    if (component) {
      component[value] = !component[value];
      FormDesignerActionDispatchers.updateFormComponent(
        component,
        props.componentId,
      );
      setComponent(props.components[props.componentId]);
    }
  };

  const handleKeyPress = (action: any) => (e: any) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <List className={classes.list}>
      <ListItem
        className={classes.listItem + ' ' + classes.listItemHeader}
      >
        <ListItemIcon
          className={menuIsOpen ? classes.rotateDown : classes.rotateRight}
          onClick={toggleMenu}
          tabIndex={0}
          onKeyPress={handleKeyPress(toggleMenu)}
        >
          <i className={'fa fa-expand-alt ' + classes.icon} />
        </ListItemIcon>
        <span className={classes.collapseHeader}>{props.header}</span>
      </ListItem>
      {menuIsOpen && (component && props.header === props.language.ux_editor.service_logic_validations) &&
        <div>
          {component.hasOwnProperty('readOnly') &&
            <ListItem
              className={classes.listItem}
            >
              <AltinnCheckBox
                checked={component.readOnly}
                onChangeFunction={toggleCheckbox('readOnly')}
                onKeyPressFunction={handleKeyPress(toggleCheckbox('readOnly'))}
              />
              {props.language.ux_editor.read_only}
            </ListItem>
          }
          {component.hasOwnProperty('required') &&
            <ListItem
              className={classes.listItem}
            >
              <AltinnCheckBox
                checked={!component.required}
                onChangeFunction={toggleCheckbox('required')}
                onKeyPressFunction={handleKeyPress(toggleCheckbox('required'))}
                disabled={getMinOccursFromDataModel(component.dataModelBindings ?
                  (component.dataModelBindings.simpleBinding ? component.dataModelBindings.simpleBinding : null)
                  : null)}
              />
              {props.language.general.optional}
            </ListItem>
          }
        </div>
      }
      {menuIsOpen && typeof (props.listItems[0].name) !== 'undefined'
        && props.listItems.map((item, index) => {
          return (
            <div key={item.name}>
              <ListItem className={classes.listItem}>
                <span
                  className={classes.link}
                  onClick={item.action}
                  tabIndex={0}
                  onKeyPress={handleKeyPress(item.action)}
                >
                  {item.name}
                </span>
              </ListItem>
              {props.children}
            </div>
          );
        })
      }
    </List>
  );
};

const mapStateToProps: (
  state: IAppState,
  props: ICollapsableMenuProvidedProps,
) => ICollapsableMenuProps = (state: IAppState, props: ICollapsableMenuProvidedProps) => ({
  children: props.children,
  classes: props.classes,
  componentId: props.componentId,
  components: state.formDesigner.layout.components,
  header: props.header,
  language: state.appData.language.language,
  listItems: props.listItems,
  dataModel: state.appData.dataModel.model,
});

export const CollapsibleMenuComponent =
  withStyles(styles, { withTheme: true })(connect(mapStateToProps)(CollapsibleMenus));
