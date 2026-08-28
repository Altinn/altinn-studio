import { describe, expect, expectTypeOf, it } from 'vitest';

import { componentCatalog } from './component-catalog.generated';
import type { ConfigurableComponent } from './generated/components.generated';
import type { SerializedComponent } from './generated/serialized-components.generated';
import type { IDataModelReference } from './generated/common.generated';

describe('componentCatalog', () => {
  it('only exposes components that may be authored in layout files', () => {
    expect('LikertItem' in componentCatalog).toBe(false);
    expect('Option' in componentCatalog).toBe(true);
  });

  it('only generates types for externally configurable components', () => {
    expectTypeOf<Extract<ConfigurableComponent, { type: 'Option' }>>().not.toBeNever();
    expectTypeOf<Extract<ConfigurableComponent, { type: 'LikertItem' }>>().toBeNever();
    expectTypeOf<Extract<SerializedComponent, { type: 'Option' }>>().not.toBeNever();
    expectTypeOf<Extract<SerializedComponent, { type: 'LikertItem' }>>().toBeNever();
  });

  it('generates serialized data-model bindings without renderer normalization', () => {
    type SerializedMap = Extract<SerializedComponent, { type: 'Map' }>;
    expectTypeOf<SerializedMap['dataModelBindings']['simpleBinding']>().toEqualTypeOf<
      string | IDataModelReference | undefined
    >();
  });

  it('includes component lifecycle metadata', () => {
    expect(Object.values(componentCatalog).every((component) => component.metadata.lifecycle)).toBe(
      true,
    );
    expect(componentCatalog.Accordion.metadata.lifecycle).toEqual({ status: 'stable' });
    expect(componentCatalog.Summary.metadata.lifecycle).toEqual({
      status: 'deprecated',
      replacedBy: 'Summary2',
    });
    expect(componentCatalog.PrintButton.metadata.lifecycle).toEqual({
      status: 'deprecated',
      replacedBy: 'PDFPreviewButton',
    });
    expect(componentCatalog.SimpleTable.metadata.lifecycle).toEqual({ status: 'beta' });
  });

  it('uses the component documentation titles', () => {
    expect(componentCatalog.Accordion.metadata.name).toEqual({
      nb: 'Trekkspilliste',
      en: 'Accordion',
    });
    expect(componentCatalog.ImageUpload.metadata.name).toEqual({
      nb: 'Bildeopplaster',
      en: 'Image Uploader',
    });
  });

  it('describes bindings', () => {
    expect(componentCatalog.Input.properties.textResourceBindings.properties).toHaveProperty(
      'title',
    );
    expect(componentCatalog.FileUpload.properties.dataModelBindings).toMatchObject({
      type: 'union',
      variants: expect.arrayContaining([
        expect.objectContaining({
          properties: expect.objectContaining({ simpleBinding: expect.any(Object) }),
        }),
        expect.objectContaining({
          properties: expect.objectContaining({ list: expect.any(Object) }),
        }),
      ]),
    });
  });

  it('describes nested objects, arrays and expressions', () => {
    expect(componentCatalog.Video.properties.video).toMatchObject({
      type: 'object',
      properties: {
        src: {
          type: 'object',
          properties: {
            nb: { type: 'string' },
            en: { type: 'string' },
          },
        },
      },
    });
    expect(componentCatalog.SimpleTable.properties.columns).toMatchObject({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          header: { type: 'string' },
          accessors: { type: 'array', items: { type: 'string' } },
        },
      },
    });
    expect(componentCatalog.Input.properties.hidden).toMatchObject({
      type: 'boolean',
      expression: true,
      default: false,
    });
  });
});
