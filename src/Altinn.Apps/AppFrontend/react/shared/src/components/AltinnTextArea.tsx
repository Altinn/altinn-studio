import {
  createTheme,
  createStyles,
  Grid,
  InputLabel,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);
const styles = createStyles({
  altinnTextAreaLabel: {
    color: theme.altinnPalette.primary.black,
    width: '100%',
    fontSize: '1.6rem',
    paddingBottom: '1rem',
  },
  altinnTextArea: {
    minHeight: '1.6rem',
    width: '100%',
    outline: 'none',
    border: `2px solid ${theme.altinnPalette.primary.blue}`,
  },
});

export interface IAltinnTextAreaProps extends
  React.TextareaHTMLAttributes<any>,
  WithStyles<typeof styles> {
  widthPercentage?: number;
  showLabel?: boolean;
  label: string;
}

function AltinnTextArea(props: IAltinnTextAreaProps) {
  const textAreaReft = React.createRef<HTMLTextAreaElement>();
  const {classes, label, widthPercentage, showLabel, ...rest } = props;

  function focusTextarea() {
    textAreaReft.current.focus();
  }

  return (
    <Grid
      container={true}
      direction={'column'}
      onClick={focusTextarea}
      aria-label={label}
    >
      {showLabel ?
        <InputLabel
          className={classes.altinnTextAreaLabel}
        >
          {label}
        </InputLabel>
        : null
      }
      <Grid
        container={true}
        direction={'row'}
        style={{
          width: widthPercentage ? `${widthPercentage}%` : '100%',
        }}
      >
        <textarea
          className={classes.altinnTextArea}
          ref={textAreaReft}
          {...rest}
        />
      </Grid>
    </Grid>
  );
}

AltinnTextArea.defaultProps = {
  showLabel: true,
};

export default withStyles(styles)(AltinnTextArea);
