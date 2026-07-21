import { indexDataModelReferenceForValidation } from 'src/utils/layout/validation/utils';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal } from 'src/layout/layout';

function makeLookups(
  components: Record<string, CompExternal | undefined>,
  componentToParent: LayoutLookups['componentToParent'],
  componentToChildren: LayoutLookups['componentToChildren'],
) {
  return {
    allComponents: components,
    componentToParent,
    componentToChildren,
    getComponent: (id: string) => components[id] as CompExternal,
  } as LayoutLookups;
}

describe('indexDataModelReferenceForValidation', () => {
  it('indexes bindings for components inside a repeating group body', () => {
    const lookups = makeLookups(
      {
        animalName: { id: 'animalName', type: 'Input' } as CompExternal,
        animalContainer: { id: 'animalContainer', type: 'Group' } as CompExternal,
        animals: {
          id: 'animals',
          type: 'RepeatingGroup',
          children: ['animalContainer'],
          dataModelBindings: {
            group: { dataType: 'ConflictingOptions', field: 'ConflictingOptions.Animals' },
          },
        } as CompExternal,
      },
      {
        animalName: { type: 'node', id: 'animalContainer' },
        animalContainer: { type: 'node', id: 'animals' },
        animals: { type: 'page', id: 'page' },
      },
      {
        animalContainer: ['animalName'],
      },
    );

    const reference: IDataModelReference = {
      dataType: 'ConflictingOptions',
      field: 'ConflictingOptions.Animals.Name',
    };

    expect(indexDataModelReferenceForValidation('animalName', reference, lookups)).toEqual({
      dataType: 'ConflictingOptions',
      field: 'ConflictingOptions.Animals[0].Name',
    });
  });

  it('does not index bindings for components outside the repeating body', () => {
    const lookups = makeLookups(
      {
        animalNameBefore: { id: 'animalNameBefore', type: 'Input' } as CompExternal,
        animalContainerBefore: { id: 'animalContainerBefore', type: 'Group' } as CompExternal,
        animals: {
          id: 'animals',
          type: 'RepeatingGroup',
          children: ['animalContainer'],
          rowsBefore: ['animalContainerBefore'],
          dataModelBindings: {
            group: { dataType: 'ConflictingOptions', field: 'ConflictingOptions.Animals' },
          },
        } as unknown as CompExternal,
      },
      {
        animalNameBefore: { type: 'node', id: 'animalContainerBefore' },
        animalContainerBefore: { type: 'node', id: 'animals' },
        animals: { type: 'page', id: 'page' },
      },
      {
        animalContainerBefore: ['animalNameBefore'],
      },
    );

    const reference: IDataModelReference = {
      dataType: 'ConflictingOptions',
      field: 'ConflictingOptions.Animals.Name',
    };

    expect(indexDataModelReferenceForValidation('animalNameBefore', reference, lookups)).toEqual(reference);
  });

  it('indexes bindings for components inside a multi-page repeating group body', () => {
    const lookups = makeLookups(
      {
        animalName: { id: 'animalName', type: 'Input' } as CompExternal,
        animals: {
          id: 'animals',
          type: 'RepeatingGroup',
          children: ['0:animalName'],
          edit: { multiPage: true },
          dataModelBindings: {
            group: { dataType: 'ConflictingOptions', field: 'ConflictingOptions.Animals' },
          },
        } as CompExternal,
      },
      {
        animalName: { type: 'node', id: 'animals' },
        animals: { type: 'page', id: 'page' },
      },
      {
        animals: ['animalName'],
      },
    );

    const reference: IDataModelReference = {
      dataType: 'ConflictingOptions',
      field: 'ConflictingOptions.Animals.Name',
    };

    expect(indexDataModelReferenceForValidation('animalName', reference, lookups)).toEqual({
      dataType: 'ConflictingOptions',
      field: 'ConflictingOptions.Animals[0].Name',
    });
  });

  it('indexes nested repeating group bindings from inner to outer', () => {
    const lookups = makeLookups(
      {
        street: { id: 'street', type: 'Input' } as CompExternal,
        addressContainer: { id: 'addressContainer', type: 'Group' } as CompExternal,
        addressGroup: {
          id: 'addressGroup',
          type: 'RepeatingGroup',
          children: ['addressContainer'],
          dataModelBindings: {
            group: { dataType: 'People', field: 'People.Addresses' },
          },
        } as CompExternal,
        personContainer: { id: 'personContainer', type: 'Group' } as CompExternal,
        personGroup: {
          id: 'personGroup',
          type: 'RepeatingGroup',
          children: ['personContainer'],
          dataModelBindings: {
            group: { dataType: 'People', field: 'People' },
          },
        } as CompExternal,
      },
      {
        street: { type: 'node', id: 'addressContainer' },
        addressContainer: { type: 'node', id: 'addressGroup' },
        addressGroup: { type: 'node', id: 'personContainer' },
        personContainer: { type: 'node', id: 'personGroup' },
        personGroup: { type: 'page', id: 'page' },
      },
      {
        addressContainer: ['street'],
        personContainer: ['addressGroup'],
      },
    );

    const reference: IDataModelReference = {
      dataType: 'People',
      field: 'People.Addresses.Street',
    };

    expect(indexDataModelReferenceForValidation('street', reference, lookups)).toEqual({
      dataType: 'People',
      field: 'People[0].Addresses[0].Street',
    });
  });
});
