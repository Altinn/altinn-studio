import * as React from 'react';
// import { makeStyles, createStyles } from '@material-ui/core/styles';

// const useStyles = makeStyles(
//   createStyles({
//     root: {
//       height: 264,
//       flexGrow: 1,
//       maxWidth: 300,
//       marginTop: 24,
//     },
//   }),
// );

export interface ISchemaInspector {
  schema: any;
}

export const SchemaInspector = ({
  schema,
}: ISchemaInspector) => {
  // const classes = useStyles();
  // const dispatch = useDispatch();
  console.log(schema);
  return (
    <div>
      <h2>Inspector</h2>
      { schema.id }
    </div>
  );
};

export default SchemaInspector;
