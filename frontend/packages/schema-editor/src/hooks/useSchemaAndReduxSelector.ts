import { useSelector } from 'react-redux';
import { SchemaAndReduxSelector } from '@altinn/schema-editor/selectors/schemaAndReduxSelectors';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

/**
 * Hook that is used to access both the datamodel and the redux state.
 * @param selector An object with the following properties:
 *   - reduxSelector: A selector that depends on the redux state.
 *   - schemaSelector: A selector that takes the data model schema and the result of the reduxSelector as parameters.
 * @returns The result of the selector.
 */
export const useSchemaAndReduxSelector = <R, S>(selector: SchemaAndReduxSelector<R, S>): S => {
  const { schemaModel } = useSchemaEditorAppContext();
  const reduxSelectorResult = useSelector(selector.reduxSelector);
  return schemaModel ? selector.schemaSelector(reduxSelectorResult, schemaModel) : null;
};
