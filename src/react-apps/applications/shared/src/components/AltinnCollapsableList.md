### Props description

Stuff goes here

```jsx
import { Typography, createStyles, withStyles } from '@material-ui/core';

const styles = () => createStyles({
  listHeaderText: {
    padding: 12,
    fontSize: '1.2rem',
  },
  listWrapper: {
    padding: 12,
  },
  listHeader: {
    padding: 12,
  },
  listHeaderIcon: {
    padding: 12,
  },
  listItem: {
    padding: 12,
  }
});

function PreviewCollapsableList({classes}) {
  const [expandList, setExpandList] = React.useState(false);

  function clickedExpandList() {
    setExpandList(!expandList);
  }

  return (
    <AltinnCollapsableList
      transition={expandList}
      expandIconClass={'ai ai-expand-circle'}
      onClickExpand={clickedExpandList}
      rotateExpandIcon={true}
      listHeader={
        <Typography className={classes.listHeaderText}>
          Collapsable list
        </Typography>
      }
      listStylingClasses={{
        listHeaderIcon: classes.listHeaderIcon,
        listWrapper: classes.listWrapper,
      }}
    >
      <Typography className={classes.listItem}>
        List item 1
      </Typography>
      <Typography className={classes.listItem}>
        List item 2
      </Typography>
      <Typography className={classes.listItem}>
        List item 3
      </Typography>
    </AltinnCollapsableList>
  )
}
const CollapsableListWithStyles = withStyles(styles)(PreviewCollapsableList);
;
<CollapsableListWithStyles/>
```
