import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { SchemaStateSelector } from '@altinn/schema-editor/selectors/schemaStateSelectors';
import { useSelector } from 'react-redux';
import {
  getParentNodeByPointer,
  getNodeByPointer,
  UiSchemaNode,
} from '@altinn/schema-model'

export const useSchemaSelector = (selector: SchemaStateSelector<string>): UiSchemaNode | null => {
  const { data } = useDatamodelQuery();
  const state = useSelector(selector);
  return data && state ? getNodeByPointer(data, state) : null;
};

export const useParentSchemaSelector = (selector: SchemaStateSelector<string>): UiSchemaNode | null => {
  const { data } = useDatamodelQuery();
  const state = useSelector(selector);
  return data && state ? getParentNodeByPointer(data, state) : null;
};
