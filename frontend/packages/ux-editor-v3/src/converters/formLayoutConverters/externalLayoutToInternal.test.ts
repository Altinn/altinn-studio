import { externalLayoutToInternal } from './externalLayoutToInternal';
import {
  externalLayoutWithMultiPageGroup,
  internalLayoutWithMultiPageGroup,
} from '../../testing/layoutWithMultiPageGroupMocks';
import { createEmptyLayout } from '../../utils/formLayoutUtils';
import type { ExternalFormLayout } from 'app-shared/types/api';
import type { IInternalLayout } from '../../types/global';
import { layoutSchemaUrl } from 'app-shared/cdn-paths';

describe('externalLayoutToInternal', () => {
  it('Converts an external layout to an internal layout', () => {
    const result = externalLayoutToInternal(externalLayoutWithMultiPageGroup);
    expect(result).toEqual(internalLayoutWithMultiPageGroup);
  });

  it('Returns an empty layout if the external layout is null', () => {
    const result = externalLayoutToInternal(null);
    expect(result).toEqual(createEmptyLayout());
  });

  it('Returns an empty layout with custom properties when the "data" property is null', () => {
    const customProperty1 = 'test1';
    const customProperty2 = 'test2';
    const externalLayout: ExternalFormLayout = {
      $schema: layoutSchemaUrl(),
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
      $schema: layoutSchemaUrl(),
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
