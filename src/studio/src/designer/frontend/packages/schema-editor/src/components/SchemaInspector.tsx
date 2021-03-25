import * as React from 'react';
import { useSelector } from 'react-redux';
import { ISchemaState } from '../types';
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
}

export const SchemaInspector = (() => {
  // const classes = useStyles();
  // const dispatch = useDispatch();
  const selectedId = useSelector((state: ISchemaState) => state.selectedId);
  const selectedDefinition = useSelector((state: ISchemaState) => {
    if (selectedId) {
      console.log(state.uiSchema);
      // selectedId: #/definitions/Foretak/properties/organisasjonsnummerForetak
      if (selectedId.includes('/properties/')) {
        const item = state.uiSchema.find((i) => i.properties?.find((e) => e.id === selectedId));
        return item?.properties?.find((p) => p.id === selectedId);
      }
      // selectedId: #/definitions/OrganisasjonsnummerRestriksjon
      return state.uiSchema.find((i) => i.id === selectedId);
    }
    return null;
  });

  const RenderSelectedItem = () => (selectedDefinition ?
    <div>
      { selectedDefinition.fields?.map((f) => <i>{f.key}: {f.value}</i>)}
    </div> : null);

  return (
    <div>
      <h2>Inspector</h2>
      <p>{ selectedId }</p>

      { RenderSelectedItem() }
    </div>
  );
});

export default SchemaInspector;
