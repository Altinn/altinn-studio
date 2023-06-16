import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { SchemaStateSelector } from '@altinn/schema-editor/selectors/schemaStateSelectors';
import { useSelector } from 'react-redux';
import { SchemaState } from '@altinn/schema-editor/types';

export const useSchemaSelector = <T>(selector: SchemaStateSelector<T>): T | null => {
  const { data } = useDatamodelQuery();
  const state = useSelector((state: SchemaState) => state);
  return data ? selector(state, data) : null;
};
