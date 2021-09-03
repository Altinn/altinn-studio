import {
  Collapse,
  Grid,
} from '@material-ui/core';
import * as React from 'react';

export interface IAltinnCollapsableListProps {
  /** Boolean value for if the animation will transition */
  transition: boolean;
  /** Callback for click on expand */
  onClickExpand: () => void;
  /** React nodes values for the list header */
  listHeader: React.ReactNode;
  children: React.ReactNode;
}

const AltinnCollapsableList = (props: IAltinnCollapsableListProps) => {
  const {
    transition,
    listHeader,
    onClickExpand,
    children,
  } = props;

  function onKeyPress(event: React.KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Enter' || event.key === ' ') {
      onClickExpand();
    }
  }

  return (
    <Grid
      container={true}
      direction='column'
    >
      <Grid
        container={true}
        direction='row'
        onClick={onClickExpand}
        onKeyPress={onKeyPress}
        tabIndex={0}
      >
        <Grid
          container={true}
          direction='row'
        >
          {listHeader}
        </Grid>
      </Grid>
      <Grid item={true}>
        <Collapse in={transition}>
          {children}
        </Collapse>
      </Grid>
    </Grid>
  );
};

export default AltinnCollapsableList;
