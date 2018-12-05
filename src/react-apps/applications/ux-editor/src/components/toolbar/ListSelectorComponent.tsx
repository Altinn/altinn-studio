import { createStyles, Select, SvgIcon, Theme, withStyles } from '@material-ui/core';
import ExpandMore from '@material-ui/icons/ExpandMore';
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
      <div
        tabIndex={0}
        style={{
          display: 'flex', verticalAlign: 'middle', minWidth: '100%', alignItems: 'center',
          paddingBottom: '6px', paddingTop: '6px', justifyContent: 'space-between',
        }}
      >
        <Select
          classes={{
            root: this.props.classes.componentListSelector,
            select: this.props.classes.select,
            icon: this.props.classes.icon,
          }}
          value={this.state.selectedList}
          disableUnderline={true}
          disabled={true}
          onChange={this.props.onChange}
          IconComponent={ExpandMore}
        >
          <option value={SelectableLists.All}>{this.props.language.ux_editor.list_all}</option>
          <option value={SelectableLists.Favourites}>{this.props.language.ux_editor.list_favourites}</option>
        </Select>

        <SvgIcon
          style={{ float: 'right', display: 'inline', verticalAlign: 'middle', width: '14px', height: 'inherit' }}
          viewBox={'0 0 14 14'}
        >
          <svg
            width='14'
            height='14'
            viewBox='0 0 14 14'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'>
            <rect x='0.5' y='0.5' width='5' height='5' rx='0.5' stroke='#022F51' />
            <rect x='8.5' y='0.5' width='5' height='5' rx='0.5' stroke='#022F51' />
            <rect x='0.5' y='8.5' width='5' height='5' rx='0.5' stroke='#022F51' />
            <rect x='8.5' y='8.5' width='5' height='5' rx='0.5' stroke='#022F51' />
          </svg>
        </SvgIcon>
      </div>
    );
  }
}

const styles = (theme: Theme) => createStyles({
  componentListSelector: {
    fontSize: '12px',
    color: '#022F51',
    fontWeight: 'bold',
    display: 'inherit',
  },
  select: {
    paddingRight: '24px',
    paddingBottom: '0px',
    paddingTop: '0px',
    minHeight: '0',
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
