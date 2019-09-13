import {
  Collapse,
  Grid,
} from '@material-ui/core';
import * as React from 'react';

export interface IAltinnCollapsableListProps {
  /** Boolean value for if the animation will transition */
  transition: boolean;
  /** String value for the icon class */
  expandIconClass: string;
  /** Callback for click on expand */
  onClickExpand: () => void;
  /** Boolean value for CSS rotation animation on expandIconClass */
  rotateExpandIcon: boolean;
  /** React nodes values for the list header */
  listHeader: React.ReactNode;
  /** Interface for styling string values should be CSS classes */
  listStylingClasses: {
    listWrapper?: string;
    listHeader?: string;
    listHeaderIcon?: string;
  };
}

const AltinnCollapsableList: React.SFC<IAltinnCollapsableListProps> = (props) => {
  const {
    transition,
    listHeader,
    expandIconClass,
    onClickExpand,
    rotateExpandIcon,
    children,
    listStylingClasses,
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
      direction={'column'}
      className={listStylingClasses.listWrapper}
    >
      <Grid
        container={true}
        direction={'row'}
        onClick={onClickExpand}
        onKeyPress={onKeyPress}
        tabIndex={0}
        style={{
          paddingLeft: '22',
          paddingRight: '22',
        }}
      >
        <Grid
          container={true}
          direction={'row'}
          className={listStylingClasses.listHeader}
        >
          <div className={listStylingClasses.listHeaderIcon}>
            <i
              className={expandIconClass}
              style={{
                WebkitTransition: '-webkit-transform 0.5s',
                transition: 'transform 0.5s',
                transform: transition && rotateExpandIcon ? 'rotate(90deg)' : 'rotate(0deg)',
                WebkitTransform: transition && rotateExpandIcon ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
          </div>
          {listHeader}
        </Grid>
      </Grid>
      <Grid
        item={true}
      >
        <Collapse
          in={transition}
        >
          {children}
        </Collapse>
      </Grid>
    </Grid>
  );
};

export default AltinnCollapsableList;
