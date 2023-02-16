import React from 'react';

import { Button } from '@digdir/design-system-react';
import { createStyles, createTheme, Grid, makeStyles, Popover, Typography } from '@material-ui/core';
import classNames from 'classnames';
import type { PopoverProps } from '@material-ui/core';

import { AltinnAppTheme } from 'src/theme/altinnAppTheme';

export interface IAnchorOrigin {
  horizontal: 'left' | 'center' | 'right' | number;
  vertical: 'top' | 'center' | 'bottom' | number;
}

export interface IAltinnPopoverProvidedProps extends React.PropsWithChildren {
  anchorEl?: PopoverProps['anchorEl'];
  anchorOrigin?: IAnchorOrigin;
  descriptionText?: string | React.ReactNode;
  handleClose: () => void;
  header?: string;
  paperProps?: PopoverProps['PaperProps'];
  transformOrigin?: {
    horizontal: 'left' | 'center' | 'right' | number;
    vertical: 'top' | 'center' | 'bottom' | number;
  };
  closeButton?: boolean;
  closeButtonText?: string;
}

const theme = createTheme(AltinnAppTheme);

const useStyles = makeStyles(() =>
  createStyles({
    borderBottom: {
      borderBottom: `1px solid${theme.altinnPalette.primary.blueDark}`,
    },
    header: {
      fontSize: '16px',
      fontWeight: 500,
      marginBottom: '10px',
    },
    subHeader: {
      fontSize: '16px',
    },
    popover: {
      width: 'auto',
      maxWidth: '445px',
      margin: '24px',
    },
    textWrap: {
      wordBreak: 'break-word',
    },
    removeMargin: {
      marginBottom: '-18px',
    },
    button: {
      marginTop: '12px',
    },
  }),
);

export const AltinnPopoverComponent = ({
  anchorOrigin,
  anchorEl,
  handleClose,
  transformOrigin,
  paperProps,
  header,
  descriptionText,
  children,
  closeButtonText,
  closeButton,
}: IAltinnPopoverProvidedProps) => {
  const classes = useStyles();
  const ref = React.useRef<HTMLDivElement>();

  React.useEffect(() => {
    if (ref.current) {
      for (const child of Array.from(ref.current.children)) {
        if (child.parentElement && child.getAttribute('tabIndex') === '0') {
          child.removeAttribute('tabIndex');
        }
      }
    }
  }, [anchorEl]);

  return (
    <>
      <Popover
        ref={ref}
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        disablePortal={true}
        disableAutoFocus={true}
        disableEnforceFocus={true}
        disableRestoreFocus={true}
        anchorOrigin={{
          horizontal: anchorOrigin?.horizontal ? anchorOrigin.horizontal : 'left',
          vertical: anchorOrigin?.vertical ? anchorOrigin.vertical : 'top',
        }}
        transformOrigin={{
          horizontal: transformOrigin?.horizontal ? transformOrigin.horizontal : 'left',
          vertical: transformOrigin?.vertical ? transformOrigin.vertical : 'top',
        }}
        PaperProps={{ square: true, ...paperProps }}
      >
        <Grid
          container={true}
          direction='column'
          className={classes.popover}
          aria-live='assertive'
          role='alert'
        >
          {header && (
            <Typography
              variant='h3'
              className={classNames(classes.header)}
              id='header'
            >
              {header}
            </Typography>
          )}

          {descriptionText && <div className={classNames(classes.textWrap)}>{descriptionText}</div>}
          {children}
          {closeButton && (
            <div className={classNames(classes.button)}>
              <Button onClick={handleClose}>{closeButtonText}</Button>
            </div>
          )}
        </Grid>
      </Popover>
    </>
  );
};
