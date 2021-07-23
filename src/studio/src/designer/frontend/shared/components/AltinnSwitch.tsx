import { createTheme, createStyles, FormControlLabel, FormGroup, Switch } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnSwitchComponentProvidedProps {
  classes: any;
  id: string;
  onChangeFunction?: any;
  switchHeader: string;
  switchDescription?: string;
  checked?: boolean;
  onBlurFunction?: any;
}

export interface IAltinnSwitchComponentState {
}

const theme = createTheme(altinnTheme);

const styles = createStyles({
  switchLabel: {
    fontSize: '16px',
  },
  switchLabelRoot: {
    marginLeft: '0',
  },
  switchInput: {
    fontSize: '16px',
    marginTop: '10px',
    color: theme.altinnPalette.primary.blueDark,
  },
  switch: {
    marginTop: '24px',
    marginBottom: '24px',
    background: 'none',
  },
});

// eslint-disable-next-line max-len
export class AltinnSwitch extends React.Component<IAltinnSwitchComponentProvidedProps, IAltinnSwitchComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <div>
        <FormGroup row={true} classes={{ root: classNames(classes.switch) }}>
          <FormControlLabel
            control={
              <Switch
                onBlur={this.props.onBlurFunction}
                onChange={this.props.onChangeFunction}
                checked={this.props.checked}
              />
            }
            label={this.props.switchHeader}
            labelPlacement='start'
            classes={{ label: classNames(classes.switchLabel), root: classNames(classes.switchLabelRoot) }}
          />
        </FormGroup>
      </div>
    );
  }
}

export default withStyles(styles)(AltinnSwitch);
