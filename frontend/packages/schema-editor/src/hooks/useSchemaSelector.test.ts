import { useSchemaSelector, useParentSchemaSelector } from './useSchemaSelector';
import { renderHook } from '@testing-library/react';
import { dataMock } from '@altinn/schema-editor/mockData';
import { selectedIdSelector } from '../selectors/schemaStateSelectors';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { useSelector } from 'react-redux';
import { buildUiSchema } from '@altinn/schema-model';

jest.mock('@altinn/schema-editor/hooks/queries');
jest.mock('react-redux');

describe('useFormLayoutsSelector', () => {
  beforeEach(() => {
    (useDatamodelQuery as jest.Mock).mockClear();
    (useSelector as jest.Mock).mockClear();
  });

  it('should return selected node', async () => {
    const uiSchema = buildUiSchema(dataMock);
    (useDatamodelQuery as jest.Mock).mockReturnValue({ data: uiSchema });

    const selectedId = '#/properties/melding';
    (useSelector as jest.Mock).mockReturnValue(selectedId);

    const { result } = renderHook(() => useSchemaSelector(selectedIdSelector));

    expect(result.current).toEqual(uiSchema.find(item => item.pointer === selectedId));
  });

  it('should return selected parent node', async () => {
    const uiSchema = buildUiSchema(dataMock);
    (useDatamodelQuery as jest.Mock).mockReturnValue({ data: uiSchema });

    const selectedId = '#/$defs/AntallRestriksjon';
    (useSelector as jest.Mock).mockReturnValue(selectedId);

    const { result } = renderHook(() => useParentSchemaSelector(selectedIdSelector));

    expect(result.current).toEqual(uiSchema.find(item => item.pointer === '#'));
  });
});
