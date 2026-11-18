import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { PageLayouts } from '../types';
import { createNewComponent, generateComponentId, isDataComponentType } from './newComponentUtils';

const pageName = 'Side1';

describe('createNewComponent', () => {
  it('creates a heading with its text', () => {
    const { component, texts } = createNewComponent({
      type: ComponentType.Heading,
      componentId: 'Heading-abc123',
      pageName,
      text: 'Ny overskrift',
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

describe('isDataComponentType', () => {
  it('is true for components that store an answer', () => {
    expect(isDataComponentType(ComponentType.Input)).toBe(true);
    expect(isDataComponentType(ComponentType.Heading)).toBe(false);
  });
});
