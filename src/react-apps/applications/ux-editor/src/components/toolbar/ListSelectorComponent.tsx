import { createStyles, Select, Theme, withStyles } from '@material-ui/core';
import { ExpandMore } from '@material-ui/icons';
import * as React from 'react';
import { connect } from 'react-redux';

export enum SelectableLists {
  All,
  Favourites,
}

export interface IListSelectorProvidedProps {
  classes: any;
  onChange: any;
}

export interface IListSelectorProps extends IListSelectorProvidedProps {
  language: any;
}

export interface IListSelectorState {
  selectedList: SelectableLists;
}

class ListSelector extends React.Component<IListSelectorProps, IListSelectorState> {

  constructor(props: IListSelectorProps, state: IListSelectorState) {
    super(props, state);
    this.state = {
      selectedList: SelectableLists.All,
    };
  }

  public render(): JSX.Element {
    return (
      <div style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
        <Select
          classes={{
            root: this.props.classes.componentListSelector,
            select: this.props.classes.select,
            icon: this.props.classes.icon,
          }}
          value={this.state.selectedList}
          disableUnderline={true}
          onChange={this.props.onChange}
          IconComponent={ExpandMore}
        >
          <option value={SelectableLists.All}>{this.props.language.ux_editor.list_all}</option>
          <option value={SelectableLists.Favourites}>{this.props.language.ux_editor.list_favourites}</option>
        </Select>
      </div >
    );
  }
}

const styles = (theme: Theme) => createStyles({
  componentListSelector: {
    fontSize: '12px',
    color: '#022F51',
    fontWeight: 'bold',
    display: 'inline-block',
  },
  select: {
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingRight: '24px',
  },
  icon: {
    position: 'absolute',
    display: 'inline-block',
  },
});

const mapStateToProps: (
  state: IAppState,
  props: IListSelectorProvidedProps,
) => IListSelectorProps = (state: IAppState, props: IListSelectorProvidedProps) => ({
  classes: props.classes,
  onChange: props.onChange,
  language: state.appData.language.language,
});

export const ListSelectorComponent =
  withStyles(styles, { withTheme: true })(connect(mapStateToProps)(ListSelector));
