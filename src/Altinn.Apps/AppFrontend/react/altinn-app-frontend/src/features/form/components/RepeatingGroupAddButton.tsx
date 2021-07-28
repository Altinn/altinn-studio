/* eslint-disable no-undef */
/* eslint-disable react/no-array-index-key */
/* eslint-disable max-len */
import React from 'react';
import { Grid, makeStyles, createTheme } from '@material-ui/core';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey, getTextResourceByKey } from 'altinn-shared/utils';
import { ILayoutGroup } from '../layout';
import { ITextResource } from '../../../types';

export interface IRepeatingGroupAddButton {
  container: ILayoutGroup;
  language: any;
  textResources: ITextResource[];
  onClickAdd: () => void;
  onKeypressAdd: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

const theme = createTheme(altinnAppTheme);

const useStyles = makeStyles({
  addButton: {
    backgroundColor: theme.altinnPalette.primary.white,
    border: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    color: theme.altinnPalette.primary.black,
    fontWeight: 'bold',
    width: '100%',
    '&:hover': {
      cursor: 'pointer',
      borderStyle: 'solid',
    },
    '&:focus': {
      outline: `2px solid ${theme.altinnPalette.primary.blueDark}`,
      border: `2px solid ${theme.altinnPalette.primary.blueDark}`,
      outlineOffset: 0,
    },
  },
  addButtonText: {
    fontWeight: 400,
    fontSize: '1.6rem',
    borderBottom: `2px solid${theme.altinnPalette.primary.blue}`,
  },
  addIcon: {
    transform: 'rotate(45deg)',
    fontSize: '3.4rem',
    marginRight: '0.7rem',
  },
});

export function RepeatingGroupAddButton({
  container,
  language,
  textResources,
  onClickAdd,
  onKeypressAdd,
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
      >
        <Grid item={true}>
          <i className={`fa fa-exit ${classes.addIcon}`} />
        </Grid>
        <Grid item={true}>
          <span className={classes.addButtonText}>
            {`${getLanguageFromKey('general.add_new', language)}
            ${container.textResourceBindings?.add_button ? getTextResourceByKey(container.textResourceBindings.add_button, textResources) : ''}`}
          </span>
        </Grid>
      </Grid>
    </Grid>
  );
}
