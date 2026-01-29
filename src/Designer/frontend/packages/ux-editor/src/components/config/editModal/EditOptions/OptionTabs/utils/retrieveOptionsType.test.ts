import type { FormItem } from '../../../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import { componentMocks } from '../../../../../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { retrieveOptionsType } from './retrieveOptionsType';
import { OptionsType } from '../enums/OptionsType';

// Test data:
const testComponent: Readonly<FormItem<SelectionComponentType>> =
  componentMocks[ComponentType.RadioButtons];
const options: FormItem<SelectionComponentType>['options'] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];
const orgName = 'org';

describe('retrieveOptionsType', () => {
  it('Returns null when no options nor optionsId are defined', () => {
    const component = { ...testComponent, options: undefined, optionsId: undefined };
    expect(retrieveOptionsType(component, { idsFromAppLibrary: [], orgName })).toBeNull();
  });

  it('Returns null when options are undefined and optionsId is an empty string', () => {
    const component = { ...testComponent, options: undefined, optionsId: '' };
    expect(retrieveOptionsType(component, { idsFromAppLibrary: [], orgName })).toBeNull();
  });

  it('Returns null when both options and optionsId are provided', () => {
    const component = { ...testComponent, options, optionsId: 'test' };
    expect(retrieveOptionsType(component, { idsFromAppLibrary: [], orgName })).toBeNull();
  });

  it('Returns "internal" when options are provided', () => {
    const component = { ...testComponent, options, optionsId: undefined };
    expect(retrieveOptionsType(component, { idsFromAppLibrary: [], orgName })).toBe(
      OptionsType.Internal,
    );
  });

  it('Returns "fromAppLibrary" when optionsId is provided and it exists in the lists of library code lists', () => {
    const optionsId = 'test';
    const idsFromAppLibrary = [optionsId, 'anotherId'];
    const component = { ...testComponent, options: undefined, optionsId };
    expect(retrieveOptionsType(component, { idsFromAppLibrary, orgName })).toBe(
      OptionsType.FromAppLibrary,
    );
  });

  it('Returns "customId" when optionsId is provided and it does not exist in the lists of library code lists', () => {
    const optionsId = 'test';
    const component = { ...testComponent, options: undefined, optionsId };
    expect(retrieveOptionsType(component, { idsFromAppLibrary: ['anotherId'], orgName })).toBe(
      OptionsType.CustomId,
    );
  });

  it('Returns "published" when optionsId is a published code list id', () => {
    const optionsId = `lib**${orgName}**name**123`;
    const component = { ...testComponent, options: undefined, optionsId };
    expect(retrieveOptionsType(component, { idsFromAppLibrary: [], orgName })).toBe(
      OptionsType.Published,
    );
  });
});
