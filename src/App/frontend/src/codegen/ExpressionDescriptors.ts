import { getSourceForCommon } from 'src/codegen/Common';
import { GenerateArray } from 'src/codegen/dataTypes/GenerateArray';
import { GenerateCommonImport } from 'src/codegen/dataTypes/GenerateCommonImport';
import { GenerateExpressionOr } from 'src/codegen/dataTypes/GenerateExpressionOr';
import { GenerateIntersection } from 'src/codegen/dataTypes/GenerateIntersection';
import { GenerateObject } from 'src/codegen/dataTypes/GenerateObject';
import { GenerateUnion } from 'src/codegen/dataTypes/GenerateUnion';
import { ExprVal } from 'src/features/expressions/types';
import type { CodeGenerator } from 'src/codegen/CodeGenerator';

/** Collects expression leaves without evaluating expressions or generating schemas. */
export function generateExpressionDescriptors(componentType: string, root: CodeGenerator<unknown>): string {
  const leaves = new Map<string, string>();

  function visit(source: CodeGenerator<unknown>, path: string[], ancestors: Set<object>) {
    if (ancestors.has(source)) {
      return;
    }
    const nextAncestors = new Set(ancestors).add(source);
    if (source instanceof GenerateExpressionOr) {
      try {
        addDescriptor(source.valueType, source.getExpressionFallback(), path);
      } catch (error) {
        throw new Error(`Cannot generate expression descriptor for ${componentType}.${path.join('.')}`, {
          cause: error,
        });
      }
    } else if (source instanceof GenerateCommonImport) {
      visit(getSourceForCommon(source.key), path, nextAncestors);
    } else if (source instanceof GenerateObject) {
      for (const property of source.getAllProperties()) {
        visit(property.type, [...path, property.name], nextAncestors);
      }
      const additional = source.getAdditionalProperties();
      if (additional) {
        visit(additional, [...path, 'additionalProperties'], nextAncestors);
      }
    } else if (source instanceof GenerateArray) {
      visit(source.innerType, [...path, 'items'], nextAncestors);
    } else if (source instanceof GenerateUnion || source instanceof GenerateIntersection) {
      const expressions = source.getTypes().filter((type) => type instanceof GenerateExpressionOr);
      if (source instanceof GenerateUnion && expressions.length > 1) {
        // The existing evaluator accepts either scalar type and uses one fallback for both.
        addDescriptor(ExprVal.Any, source.getExpressionFallback(), path);
      }
      for (const type of source.getTypes()) {
        if (source instanceof GenerateUnion && expressions.length > 1 && type instanceof GenerateExpressionOr) {
          continue;
        }
        visit(type, path, nextAncestors);
      }
    } else if (source.internal.source) {
      visit(source.internal.source, path, nextAncestors);
    }
  }

  function addDescriptor(valueType: ExprVal, fallback: unknown, path: string[]) {
    const typeName = Object.entries(ExprVal).find(([, value]) => value === valueType)?.[0];
    if (!typeName) {
      throw new Error(`Unknown expression return type ${valueType}`);
    }
    const propertyPath = path.join('.');
    const definition = `{
      returnType: ExprVal.${typeName},
      defaultValue: ${serializeFallback(fallback)},
      errorIntroText: ${JSON.stringify(`Invalid expression for ${componentType}, property ${propertyPath}`)},
    } satisfies ExpressionDescriptor<ExprVal.${typeName}>`;
    if (leaves.has(propertyPath) && leaves.get(propertyPath) !== definition) {
      throw new Error(`Conflicting expression descriptors at ${componentType}.${propertyPath}`);
    }
    leaves.set(propertyPath, definition);
  }

  visit(root, [], new Set());
  const tree: DescriptorTree = {};
  for (const [path, definition] of leaves) {
    let current = tree;
    const segments = path.split('.');
    for (const segment of segments.slice(0, -1)) {
      const child = current[segment];
      if (typeof child === 'string') {
        throw new Error(`Conflicting expression descriptors at ${componentType}.${path}`);
      }
      current = child ?? (current[segment] = {});
    }
    current[segments[segments.length - 1]] = definition;
  }
  return renderTree(tree);
}

interface DescriptorTree {
  [key: string]: DescriptorTree | string;
}

function renderTree(tree: DescriptorTree): string {
  return `{${Object.entries(tree)
    .map(([key, value]) => `${JSON.stringify(key)}: ${typeof value === 'string' ? value : renderTree(value)}`)
    .join(',\n')}}`;
}

function serializeFallback(value: unknown): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return String(value);
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error('Expression fallback must be serializable');
  }
  return serialized;
}
