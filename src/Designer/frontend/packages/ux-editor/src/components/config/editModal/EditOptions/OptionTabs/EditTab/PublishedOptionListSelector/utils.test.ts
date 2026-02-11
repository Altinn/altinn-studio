import type { FormItem } from '../../../../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { componentMocks } from '../../../../../../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { PublishedCodeListReferenceValues } from '../../types/PublishedCodeListReferenceValues';
import { createPublishedCodeListReferenceString } from '../../utils/published-code-list-reference-utils';
import {
  extractPublishedCodeListNameFromComponent,
  extractPublishedCodeListVersionFromComponent,
  updatePublishedCodeListReferenceInComponent,
} from './utils';

// Test data:
const orgName = 'some-org';
const codeListName = 'some-code-list';
const version = '1';
const referenceValues: PublishedCodeListReferenceValues = { codeListName, version, orgName };

describe('PublishedOptionListSelector utils', () => {
  describe('extractPublishedCodeListNameFromComponent', () => {
    it("Returns the code list name from the component's optionsId setting", () => {
      const referenceString = createPublishedCodeListReferenceString(referenceValues);
      const component = createTestComponent(referenceString);
      expect(extractPublishedCodeListNameFromComponent(component)).toBe(codeListName);
    });

    it('Returns an empty string when the optionsId is not a published code list reference', () => {
      const component = createTestComponent('some-other-id');
      expect(extractPublishedCodeListNameFromComponent(component)).toBe('');
    });

    it('Returns an empty string when no optionsId is set', () => {
      const component = createTestComponent(undefined);
      expect(extractPublishedCodeListNameFromComponent(component)).toBe('');
    });
  });

  describe('extractPublishedCodeListVersionFromComponent', () => {
    it("Returns the version from the component's optionsId setting", () => {
      const referenceString = createPublishedCodeListReferenceString(referenceValues);
      const component = createTestComponent(referenceString);
      expect(extractPublishedCodeListVersionFromComponent(component)).toBe(version);
    });

    it('Returns an empty string when the optionsId is not a published code list reference', () => {
      const component = createTestComponent('some-other-id');
      expect(extractPublishedCodeListVersionFromComponent(component)).toBe('');
    });

    it('Returns an empty string when no optionsId is set', () => {
      const component = createTestComponent(undefined);
      expect(extractPublishedCodeListVersionFromComponent(component)).toBe('');
    });
  });

  describe('updatePublishedCodeListReferenceInComponent', () => {
    it("Updates the component's optionsId setting to a published code list reference string based on the provided values", () => {
      const component = createTestComponent('some-other-id');
      const updatedComponent = updatePublishedCodeListReferenceInComponent(
        component,
        referenceValues,
      );
      const expectedOptionsId = createPublishedCodeListReferenceString(referenceValues);
      expect(updatedComponent.optionsId).toBe(expectedOptionsId);
    });

    it("Sets the component's options setting to undefined", () => {
      const component = {
        ...createTestComponent(undefined),
        options: [],
      };
      const updatedComponent = updatePublishedCodeListReferenceInComponent(
        component,
        referenceValues,
      );
      expect(updatedComponent.options).toBeUndefined();
    });
  });
});

function createTestComponent(optionsId: string | undefined): FormItem<SelectionComponentType> {
  return {
    ...componentMocks[ComponentType.RadioButtons],
    options: undefined,
    optionsId,
  };
}
