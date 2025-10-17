import type { CodeListItem } from '../types/CodeListItem';
import { ObjectUtils } from '@studio/pure-functions';
import { changeDescription, changeHelpText, changeLabel, changeValue } from './utils';

// Test data:
const testItem: CodeListItem = {
  value: 'test',
  label: {
    nb: 'Ledetekst',
    en: 'Label',
  },
  description: {
    nb: 'Beskrivelse',
    en: 'Description',
  },
  helpText: {
    nb: 'Hjelpetekst',
    en: 'Help text',
  },
};
const createTestItem = (): CodeListItem => ObjectUtils.deepCopy(testItem);

describe('StudioCodeListEditorRow utils', () => {
  describe('changeValue', () => {
    it('Changes the value of the code list item', () => {
      const item = createTestItem();
      const newValue = 'updatedValue';
      const updatedItem = changeValue(item, newValue);
      expect(updatedItem.value).toBe(newValue);
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeValue(item, 'updatedValue');
      expect(updatedItem).not.toBe(item);
    });
  });

  describe('changeLabel', () => {
    it('Changes the label of the code list item', () => {
      const item = createTestItem();
      const newLabel = 'Ny ledetekst';
      const updatedItem = changeLabel(item, 'nb', newLabel);
      expect(updatedItem.label).toEqual({ nb: 'Ny ledetekst', en: 'Label' });
    });

    it('Adds a new label object when none exists', () => {
      const value = 'test';
      const item: CodeListItem = { value };
      const newLabel = 'Ny ledetekst';
      const updatedItem = changeLabel(item, 'nb', newLabel);
      expect(updatedItem).toEqual({ value, label: { nb: newLabel } });
    });

    it('Adds a new label when it does not exist for the specified language', () => {
      const item = createTestItem();
      const newLabel = 'Ny ledetekst';
      const updatedItem = changeLabel(item, 'nn', newLabel);
      expect(updatedItem.label).toEqual({ nb: 'Ledetekst', en: 'Label', nn: 'Ny ledetekst' });
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeLabel(item, 'nb', 'Ny ledetekst');
      expect(updatedItem).not.toBe(item);
    });
  });

  describe('changeDescription', () => {
    it('Changes the description of the code list item', () => {
      const item = createTestItem();
      const newDescription = 'Ny beskrivelse';
      const updatedItem = changeDescription(item, 'nb', newDescription);
      expect(updatedItem.description).toEqual({ nb: 'Ny beskrivelse', en: 'Description' });
    });

    it('Adds a new description object when none exists', () => {
      const value = 'test';
      const item: CodeListItem = { value };
      const newDescription = 'Ny beskrivelse';
      const updatedItem = changeDescription(item, 'nb', newDescription);
      expect(updatedItem).toEqual({ value, description: { nb: newDescription } });
    });

    it('Adds a new description when it does not exist for the specified language', () => {
      const item = createTestItem();
      const newDescription = 'Ny beskrivelse';
      const updatedItem = changeDescription(item, 'nn', newDescription);
      expect(updatedItem.description).toEqual({
        nb: 'Beskrivelse',
        en: 'Description',
        nn: 'Ny beskrivelse',
      });
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeDescription(item, 'nb', 'Ny beskrivelse');
      expect(updatedItem).not.toBe(item);
    });
  });

  describe('changeHelpText', () => {
    it('Changes the help text of the code list item', () => {
      const item = createTestItem();
      const newHelpText = 'Ny hjelpetekst';
      const updatedItem = changeHelpText(item, 'nb', newHelpText);
      expect(updatedItem.helpText).toEqual({ nb: 'Ny hjelpetekst', en: 'Help text' });
    });

    it('Adds a new help text object when none exists', () => {
      const value = 'test';
      const item: CodeListItem = { value };
      const newHelpText = 'Ny hjelpetekst';
      const updatedItem = changeHelpText(item, 'nb', newHelpText);
      expect(updatedItem).toEqual({ value, helpText: { nb: newHelpText } });
    });

    it('Adds a new help text when it does not exist for the specified language', () => {
      const item = createTestItem();
      const newHelpText = 'Ny hjelpetekst';
      const updatedItem = changeHelpText(item, 'nn', newHelpText);
      expect(updatedItem.helpText).toEqual({
        nb: 'Hjelpetekst',
        en: 'Help text',
        nn: 'Ny hjelpetekst',
      });
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeHelpText(item, 'nb', 'Ny hjelpetekst');
      expect(updatedItem).not.toBe(item);
    });
  });
});
