import React from 'react';
import { Grid, makeStyles, createMuiTheme } from '@material-ui/core';
import { AltinnButton } from 'altinn-shared/components';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { ILayoutComponent } from '../layout';
import { renderGenericComponent } from '../../../utils/layout';
import FormLayoutActions from '../layout/formLayoutActions';

export interface IGroupProps {
  id: string;
  components: ILayoutComponent[]
  repeating?: boolean;
  index?: number;
  dataModelBinding?: string;
  showAdd?: boolean;
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
  },
});

export function Group({
  id,
  components,
  repeating,
  index,
  dataModelBinding,
  showAdd,
}: IGroupProps): JSX.Element {
  const classes = useStyles();

  const [ready, setReady] = React.useState<boolean>(false);

  if (repeating && !ready) {
    components.forEach((component) => {
      Object.keys(component.dataModelBindings).forEach((key) => {
        // eslint-disable-next-line no-param-reassign
        component.dataModelBindings[key] = component.dataModelBindings[key].replace(dataModelBinding, `${dataModelBinding}[${index}]`);
      });
    });
    setReady(true);
  }

  const onCLickAdd = () => {
    FormLayoutActions.updateRenderLayout(id, index);
  };

  return (
    <>
      <Grid
        container={true}
        xs={12}
      >
        { components.map(renderGenericComponent) }
      </Grid>
      <Grid
        container={true}
        justify='flex-end'
        className={showAdd ? null : classes.notLastGroup}
      >
        {repeating &&
        <Grid
          item={true}
          xs={2}
        >
          <i
            className='ai ai-trash'
            aria-label='delete' /* {getLanguageFromKey('general.delete', props.language) } */
          />
          <AltinnButton
            btnText='Slett'
            onClickFunction={onCLickAdd}
            secondaryButton={true}
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
            btnText='Legg til'
            onClickFunction={onCLickAdd}
            className={classes.addButton}
          />
        </Grid>
      </Grid>
      }
    </>
  );
}
