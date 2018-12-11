import { Chip, createMuiTheme } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import altinnTheme from '../theme/altinnStudioTheme';
import * as React from 'react';

export interface IAltinnFilterChipCompontentProvidedProps {
  classes: any;
  key: any;
  label: string;
  onclickFunction?: any;
  active: boolean;
  className?: string;
  deleteIcon?: any;
  onDeleteFunction?: any;
  sortIcon?: boolean;
}

export interface IAltinnFilterChipComponentState {
}

const theme = createMuiTheme(altinnTheme);

const styles = {
  chip: {
    color: '#000000',
    borderColor: theme.palette.primary.dark,
    borderWidth: '1px',
    borderStyle: 'dotted',
    backgroundColor: '#FFF',
    borderRadius: '36px',
    minHeight: '36px',
    fontSize: '16px',
    '&:hover': {
      backgroundColor: 'transparent !Important',
    },
    '&:focus': {
      backgroundColor: 'transparent !Important',
      borderColor: theme.palette.primary.main,
      borderWidth: '1px',
      borderStyle: 'solid',
    },
  },
  chipActive: {
    backgroundColor: theme.palette.primary.light + ' !Important',
    border: '1px solid ' + theme.palette.primary.dark,
    borderRadius: '36px',
    minHeight: '36px',
    fontSize: '16px',
    '&:hover': {
      backgroundColor: theme.palette.primary.light + ' !Important',
    },
    '&:focus': {
      backgroundColor: theme.palette.primary.light + ' !Important',
      border: '1px solid ' + theme.palette.primary.main,
    }
  },
  down: {
    borderTop: '10px solid black',
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    margin: '4px 8px 2px 0px',
  },
}

class AltinnFilterChip extends React.Component<IAltinnFilterChipCompontentProvidedProps, IAltinnFilterChipComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <Chip
        key={this.props.key}
        label={this.props.label}
        clickable={true}
        color='primary'
        variant='outlined'
        onClick={this.props.onclickFunction}
        onDelete={this.props.onDeleteFunction}
        deleteIcon={this.props.sortIcon ? <i className={classNames(classes.down)} /> : this.props.deleteIcon}
        className={classNames(
          this.props.className,
          classes.chip,
          { [classes.chipActive]: this.props.active })}
      />
    );
  }
}

export default withStyles(styles)(AltinnFilterChip);