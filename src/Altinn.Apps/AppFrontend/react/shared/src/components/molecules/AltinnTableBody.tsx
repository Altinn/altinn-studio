import { makeStyles, TableBody } from "@material-ui/core";
import React from 'react';
import theme from '../../theme/altinnAppTheme';

export interface IAltinnTableBody {
  children: React.ReactNode;
  id: string;
}

const useStyles = makeStyles({
  tableBody: {
    '& td': {
      borderBottom: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
      padding: '0px',
      paddingLeft: '6px',
      fontSize: '1.4rem',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
    },
    '& tr': {
      '&:hover': {
        background: theme.altinnPalette.primary.blueLighter,
      }
    }
  },
});

export default function AltinnTableBody(props: IAltinnTableBody) {
  const { children, id } = props;
  const classes = useStyles();

  return (
    <TableBody className={classes.tableBody} id={id}>
      { children }
    </TableBody>
  );
}
