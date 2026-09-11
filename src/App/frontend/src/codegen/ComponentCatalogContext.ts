import type { PropertyValueDefinition } from '@app/layout-contract';

import type { MaybeSymbolizedCodeGenerator } from 'src/codegen/CodeGenerator';

export class ComponentCatalogContext {
  private static current: ComponentCatalogContext | undefined;

  private readonly symbols = new Map<string, PropertyValueDefinition>();
  private readonly generating = new Set<string>();
  private readonly values = new WeakMap<MaybeSymbolizedCodeGenerator<unknown>, PropertyValueDefinition>();

  static generate<T>(buildRoot: () => T): {
    root: T;
    symbols: ReadonlyMap<string, PropertyValueDefinition>;
  } {
    const context = new ComponentCatalogContext();
    ComponentCatalogContext.current = context;
    try {
      const root = buildRoot();
      return { root, symbols: context.symbols };
    } finally {
      ComponentCatalogContext.current = undefined;
    }
  }

  static describe(generator: MaybeSymbolizedCodeGenerator<unknown>): PropertyValueDefinition {
    const context = ComponentCatalogContext.current;
    if (!context) {
      throw new Error('Component catalogue generation must run inside ComponentCatalogContext.generate()');
    }
    const existing = context.values.get(generator);
    if (existing) {
      return existing;
    }

    const name = generator.getName();
    if (!name) {
      const definition = generator.toComponentCatalogDefinition();
      context.values.set(generator, definition);
      return definition;
    }
    if (context.symbols.has(name)) {
      return context.symbols.get(name)!;
    }
    if (context.generating.has(name)) {
      throw new Error(`Recursive component catalogue symbol: ${name}`);
    }

    context.generating.add(name);
    const definition = generator.toComponentCatalogDefinition();
    context.generating.delete(name);
    context.symbols.set(name, definition);
    context.values.set(generator, definition);
    return definition;
  }
}
