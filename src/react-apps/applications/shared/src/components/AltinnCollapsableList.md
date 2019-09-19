### Props description

Stuff goes here

```jsx
import { Typography, createStyles, withStyles } from '@material-ui/core';

const styles = () => createStyles({
  listHeaderText: {
    padding: 12,
    fontSize: '1.2rem',
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
      onClickExpand={clickedExpandList}
      listHeader={
        <Typography className={classes.listHeaderText}>
          Collapsable list
        </Typography>
      }
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
