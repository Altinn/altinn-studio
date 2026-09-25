import { ExprVal } from 'src/features/expressions/types';
import type { CodeGenerator } from 'src/codegen/CodeGenerator';

export interface ExpressionDescriptorEntry {
  path: readonly string[];
  returnType: ExprVal;
  defaultValue: unknown;
}

export function prefixExpressionDescriptors(
  segment: string,
  entries: readonly ExpressionDescriptorEntry[],
): ExpressionDescriptorEntry[] {
  return entries.map((entry) => ({ ...entry, path: [segment, ...entry.path] }));
}

/** Renders the expression descriptors assembled by the generator objects. */
export function generateExpressionDescriptors(componentType: string, root: CodeGenerator<unknown>): string {
  const leaves = new Map<string, string>();
  for (const entry of root.expressionDescriptors()) {
    const propertyPath = entry.path.join('.');
    const descriptor = renderDescriptor(entry, componentType, propertyPath);
    if (leaves.has(propertyPath) && leaves.get(propertyPath) !== descriptor) {
      throw new Error(`Conflicting expression descriptors at ${componentType}.${propertyPath}`);
    }
    leaves.set(propertyPath, descriptor);
  }

  const tree: DescriptorTree = {};
  for (const [path, descriptor] of leaves) {
    let current = tree;
    const segments = path.split('.');
    for (const segment of segments.slice(0, -1)) {
      const child = current[segment];
      if (typeof child === 'string') {
        throw new Error(`Conflicting expression descriptors at ${componentType}.${path}`);
      }
      current = child ?? (current[segment] = {});
    }
    current[segments[segments.length - 1]] = descriptor;
  }
  return renderTree(tree);
}

function renderDescriptor(entry: ExpressionDescriptorEntry, componentType: string, propertyPath: string): string {
  const typeName = Object.entries(ExprVal).find(([, value]) => value === entry.returnType)?.[0];
  if (!typeName) {
    throw new Error(`Unknown expression return type ${entry.returnType}`);
  }
  return `{
    returnType: ExprVal.${typeName},
    defaultValue: ${serializeFallback(entry.defaultValue)},
    errorIntroText: ${JSON.stringify(`Invalid expression for ${componentType}, property ${propertyPath}`)},
  } satisfies ExpressionDescriptor<ExprVal.${typeName}>`;
}

function serializeFallback(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return String(value);
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error('Expression fallback must be serializable');
  }
  return serialized;
}

interface DescriptorTree {
  [key: string]: DescriptorTree | string;
}

function renderTree(tree: DescriptorTree): string {
  return `{${Object.entries(tree)
    .map(([key, value]) => `${JSON.stringify(key)}: ${typeof value === 'string' ? value : renderTree(value)}`)
    .join(',\n')}}`;
}
