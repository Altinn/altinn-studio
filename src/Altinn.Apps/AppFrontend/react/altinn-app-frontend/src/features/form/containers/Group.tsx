import React from 'react';
import { Grid, makeStyles, createMuiTheme } from '@material-ui/core';
import { AltinnButton } from 'altinn-shared/components';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { useSelector } from 'react-redux';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { ILayoutComponent } from '../layout';
import { renderGenericComponent } from '../../../utils/layout';
import FormLayoutActions from '../layout/formLayoutActions';
import { IRuntimeState } from '../../../types';

export interface IGroupProps {
  id: string;
  components: ILayoutComponent[]
  repeating?: boolean;
  index?: number;
  showAdd?: boolean;
  showDelete?: boolean;
  showSeparator?: boolean;
}

const theme = createMuiTheme(altinnAppTheme);

const useStyles = makeStyles({
  addButton: {
    backgroundColor: theme.altinnPalette.primary.white,
    border: `2px dashed ${theme.altinnPalette.primary.blue}`,
    color: theme.altinnPalette.primary.black,
  },
  notLastGroup: {
    borderBottom: '0.5px solid #6A6A6A',
    paddingBottom: 10,
  },
});

export function Group({
  id,
  components,
  repeating,
  index,
  showAdd,
  showDelete,
  showSeparator,
}: IGroupProps): JSX.Element {
  const classes = useStyles();
  const renderComponents = JSON.parse(JSON.stringify(components));
  const language: any = useSelector((state: IRuntimeState) => state.language.language);

  const onClickAdd = () => {
    FormLayoutActions.updateRepeatingGroups(id);
  };

  const onClickRemove = () => {
    FormLayoutActions.updateRepeatingGroups(id, true, index);
  };

  return (
    <>
      <Grid
        container={true}
        data-testid={`group-${id}-${index}`}
        id={`group-${id}-${index}`}
      >
        { renderComponents.map(renderGenericComponent) }
      </Grid>
      <Grid
        container={true}
        justify='flex-end'
        className={showSeparator ? classes.notLastGroup : null}
      >
        {repeating && showDelete &&
        <Grid
          item={true}
          xs={2}
        >
          <i
            className='ai ai-trash'
            aria-label={getLanguageFromKey('general.delete', language)}
          />
          <AltinnButton
            btnText={getLanguageFromKey('general.delete', language)}
            onClickFunction={onClickRemove}
            secondaryButton={true}
            id={`delete-button-grp-${id}`}
          />
        </Grid>
        }
      </Grid>
      {repeating && showAdd &&
      <Grid
        container={true}
      >
        <Grid item={true} xs={12}>
          <AltinnButton
            btnText={getLanguageFromKey('general.add', language)}
            onClickFunction={onClickAdd}
            className={classes.addButton}
            id={`add-button-grp-${id}`}
          />
        </Grid>
      </Grid>
      }
    </>
  );
}
