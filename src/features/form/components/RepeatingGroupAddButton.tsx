import React from 'react';

import { createTheme, Grid, makeStyles } from '@material-ui/core';

import { getLanguageFromKey, getTextResourceByKey } from 'src/language/sharedLanguage';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { ITextResource, ITextResourceBindings } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export interface IRepeatingGroupAddButton {
  language: ILanguage;
  textResources: ITextResource[];
  textResourceBindings?: ITextResourceBindings;
  onClickAdd: () => void;
  onKeypressAdd: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  id?: string;
}

const theme = createTheme(AltinnAppTheme);

const useStyles = makeStyles({
  addButton: {
    backgroundColor: theme.altinnPalette.primary.white,
    border: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    color: theme.altinnPalette.primary.black,
    fontWeight: 'bold',
    width: '100%',
    margin: '0 24px',
    padding: '4px 0',
    '@media (min-width:768px)': {
      margin: '0',
    },
    '&:hover': {
      cursor: 'pointer',
      borderStyle: 'solid',
      backgroundColor: theme.altinnPalette.primary.blueLighter,
    },
    '&:focus': {
      outline: `2px solid ${theme.altinnPalette.primary.blueDark}`,
      border: `2px solid ${theme.altinnPalette.primary.blueDark}`,
      outlineOffset: 0,
    },
  },
  addButtonText: {
    fontWeight: 400,
    fontSize: '1rem',
    borderBottom: `2px solid${theme.altinnPalette.primary.blue}`,
    paddingBottom: '3px',
    marginLeft: '6px',
  },
  addIcon: {
    transform: 'rotate(45deg)',
    fontSize: '2.125rem',
    marginRight: '0.4375rem',
  },
});

export function RepeatingGroupAddButton({
  language,
  textResources,
  textResourceBindings,
  onClickAdd,
  onKeypressAdd,
  id,
}: IRepeatingGroupAddButton): JSX.Element {
  const classes = useStyles();

  return (
    <Grid
      container={true}
      direction='row'
      justifyContent='center'
    >
      <Grid
        item={true}
        container={true}
        direction='row'
        xs={12}
        className={classes.addButton}
        role='button'
        tabIndex={0}
        onClick={onClickAdd}
        onKeyPress={(event) => onKeypressAdd(event)}
        justifyContent='center'
        alignItems='center'
        id={id}
      >
        <Grid item={true}>
          <i className={`fa fa-exit ${classes.addIcon}`} />
        </Grid>
        <Grid item={true}>
          <span className={classes.addButtonText}>
            {`${getLanguageFromKey('general.add_new', language)}
            ${
              textResourceBindings?.add_button
                ? getTextResourceByKey(textResourceBindings.add_button, textResources)
                : ''
            }`}
          </span>
        </Grid>
      </Grid>
    </Grid>
  );
}
