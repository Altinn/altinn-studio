import { externalLayoutToInternal } from './externalLayoutToInternal';
import { complexExternalLayout, complexInternalLayout } from '../../testing/complexLayoutMocks';
import { createEmptyLayout } from '../../utils/formLayoutUtils';
import { ExternalFormLayout } from 'app-shared/types/api';
import { IInternalLayout } from '../../types/global';

describe('externalLayoutToInternal', () => {
  it('Converts an external layout to an internal layout', () => {
    const result = externalLayoutToInternal(complexExternalLayout);
    expect(result).toEqual(complexInternalLayout);
  });

  it('Returns an empty layout if the external layout is null', () => {
    const result = externalLayoutToInternal(null);
    expect(result).toEqual(createEmptyLayout());
  });

  it('Returns an empty layout with custom properties when the "data" property is null', () => {
    const customProperty1 = 'test1';
    const customProperty2 = 'test2';
    const externalLayout: ExternalFormLayout = {
      $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
      data: null,
      customProperty1,
      customProperty2,
    };
    const expectedResult: IInternalLayout = {
      ...createEmptyLayout(),
      customRootProperties: {
        customProperty1,
        customProperty2,
      },
    };
    const result = externalLayoutToInternal(externalLayout);
    expect(result).toEqual(expectedResult);
  });

  it('Returns an empty layout with custom properties when the "layout" property within the "data" property is null', () => {
    const rootCustomProperty1 = 'test1';
    const rootCustomProperty2 = 'test2';
    const dataCustomProperty1 = 'test3';
    const dataCustomProperty2 = 'test4';
    const externalLayout: ExternalFormLayout = {
      $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
      data: {
        layout: null,
        dataCustomProperty1,
        dataCustomProperty2,
      },
      rootCustomProperty1,
      rootCustomProperty2,
    };
    const expectedResult: IInternalLayout = {
      ...createEmptyLayout(),
      customRootProperties: {
        rootCustomProperty1,
        rootCustomProperty2,
      },
      customDataProperties: {
        dataCustomProperty1,
        dataCustomProperty2,
      },
    };
    const result = externalLayoutToInternal(externalLayout);
    expect(result).toEqual(expectedResult);
  });
});
