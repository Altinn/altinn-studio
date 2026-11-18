import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { PageLayouts } from '../types';
import {
  createNewComponent,
  generateComponentId,
  isQuestionType,
  savesToDataModel,
} from './newComponentUtils';

const pageName = 'Side1';

describe('createNewComponent', () => {
  it('creates a heading with its text', () => {
    const { component, texts } = createNewComponent({
      type: ComponentType.Heading,
      componentId: 'Heading-abc123',
      pageName,
      text: 'Ny overskrift',
      optionTexts: [],
    });
    expect(component).toEqual({
      id: 'Heading-abc123',
      type: 'Heading',
      size: 'L',
      textResourceBindings: { title: 'Side1.Heading-abc123.title' },
    });
    expect(texts).toEqual({ 'Side1.Heading-abc123.title': 'Ny overskrift' });
  });

  it('creates an input bound to a data model field', () => {
    const { component } = createNewComponent({
      type: ComponentType.Input,
      componentId: 'Input-abc123',
      pageName,
      text: 'Fornavn',
      optionTexts: [],
      required: true,
      binding: { field: 'fornavn', dataType: 'model' },
    });
    expect(component.required).toBe(true);
    expect(component.dataModelBindings).toEqual({
      simpleBinding: { field: 'fornavn', dataType: 'model' },
    });
  });

  it('leaves out required and the binding when they are not given', () => {
    const { component } = createNewComponent({
      type: ComponentType.TextArea,
      componentId: 'TextArea-abc123',
      pageName,
      text: 'Begrunnelse',
      optionTexts: [],
    });
    expect(component).not.toHaveProperty('required');
    expect(component).not.toHaveProperty('dataModelBindings');
  });

  it('creates checkboxes with two example options and their texts', () => {
    const { component, texts } = createNewComponent({
      type: ComponentType.Checkboxes,
      componentId: 'Checkboxes-abc123',
      pageName,
      text: 'Velg',
      optionTexts: ['Alternativ 1', 'Alternativ 2'],
    });
    expect(component.options).toEqual([
      { value: '1', label: 'Side1.Checkboxes-abc123.option1' },
      { value: '2', label: 'Side1.Checkboxes-abc123.option2' },
    ]);
    expect(texts['Side1.Checkboxes-abc123.option2']).toBe('Alternativ 2');
  });
});

describe('generateComponentId', () => {
  it('starts with the type and is not used on any page', () => {
    const layouts: PageLayouts = {
      Side1: { $schema: '', data: { layout: [{ id: 'Input-taken1', type: ComponentType.Input }] } },
    };
    const componentId = generateComponentId(ComponentType.Input, layouts);
    expect(componentId).toMatch(/^Input-[A-Za-z0-9]{6}$/);
    expect(componentId).not.toBe('Input-taken1');
  });
});

describe('isQuestionType', () => {
  it('is true for components that ask the user something', () => {
    expect(isQuestionType(ComponentType.Input)).toBe(true);
    expect(isQuestionType(ComponentType.FileUpload)).toBe(true);
    expect(isQuestionType(ComponentType.Heading)).toBe(false);
  });
});

describe('savesToDataModel', () => {
  it('is false for a file upload, which saves attachments', () => {
    expect(savesToDataModel(ComponentType.FileUpload)).toBe(false);
    expect(savesToDataModel(ComponentType.Datepicker)).toBe(true);
  });
});

describe('createNewComponent, type defaults', () => {
  const create = (type: Parameters<typeof createNewComponent>[0]['type']) =>
    createNewComponent({
      type,
      componentId: 'id',
      pageName,
      text: 'Tekst',
      optionTexts: ['A', 'B'],
    });

  it('puts the text of an alert in its body', () => {
    expect(create(ComponentType.Alert).component).toMatchObject({
      severity: 'info',
      textResourceBindings: { body: 'Side1.id.body' },
    });
  });

  it('gives radio buttons the yes or no code list', () => {
    const { component } = create(ComponentType.RadioButtons);
    expect(component.optionsId).toBe('janei');
    expect(component).not.toHaveProperty('options');
  });

  it('lets a file upload take one file of any type', () => {
    const { component } = create(ComponentType.FileUpload);
    expect(component).toMatchObject({ maxNumberOfAttachments: 1 });
    expect(component).not.toHaveProperty('validFileEndings');
  });

  it('creates a group without children', () => {
    expect(create(ComponentType.Group).component.children).toEqual([]);
  });
});
