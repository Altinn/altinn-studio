import { createStyles, Theme, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';

export enum SelectableLists {
  All = 'ALL',
  Favorites = 'FAVORITES',
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
  public render(): JSX.Element {
    return (
      <div>Hello</div>
    );
  }
}

const styles = (theme: Theme) => createStyles({
  componentListSelector: {
    fontSize: '12px',
    color: '#022F51',
    fontWeight: 'bold',
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
