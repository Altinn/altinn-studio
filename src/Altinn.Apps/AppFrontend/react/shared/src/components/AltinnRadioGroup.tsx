import { RadioGroup, Typography } from '@material-ui/core';
import { createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';

export interface IAltinnRadioGroupComponentProvidedProps extends WithStyles<typeof styles> {
  id?: any;
  value: any;
  onChange?: any;
  className?: any;
  name?: string;
  row?: boolean;
  description?: string;
}

const styles = () => createStyles({
  altinnRadioGroup: {
    marginTop: '0rem',
    marginBottom: '0rem',
  },
  altinnRadioGroupWrapper: {
    marginTop: '2.4rem',
  },
  altinnRadioGroupDescription: {
    fontSize: '1.6rem',
  },
});

export class AltinnRadioGroup extends
  React.Component<IAltinnRadioGroupComponentProvidedProps> {

  public render() {
    return (
      <div className={this.props.classes.altinnRadioGroupWrapper}>
        {this.props.description &&
          <Typography classes={{ root: this.props.classes.altinnRadioGroupDescription }}>
            {this.props.description}
          </Typography>
        }
        <RadioGroup
          classes={{ root: this.props.classes.altinnRadioGroup }}
          onChange={this.props.onChange}
          value={this.props.value}
          className={this.props.className}
          name={this.props.name}
          id={this.props.id}
          row={this.props.row}
        >
          {this.props.children}
        </RadioGroup>
      </div>
    );
  }
}

export default withStyles(styles)(AltinnRadioGroup);
