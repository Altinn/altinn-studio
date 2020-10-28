import React from 'react';
import { fade, makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import { TreeItem, TreeItemProps } from '@material-ui/lab';
import { TransitionComponent } from './utils';

export interface ISchemaItemProps extends TreeItemProps {
  schemaPath: string;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    iconContainer: {
      '& .close': {
        opacity: 0.3,
      },
    },
    group: {
      marginLeft: 7,
      paddingLeft: 18,
      borderLeft: `1px dashed ${fade(theme.palette.text.primary, 0.4)}`,
    }
  }),
);

export const SchemaItem = (props: ISchemaItemProps) => {
  const classes = useStyles();
  const {schemaPath, ...treeViewProps} = props;

  return (
    <TreeItem
      {...treeViewProps}
      className={`${classes.iconContainer} ${classes.group}`}
      TransitionComponent={TransitionComponent}
    />
  )
}