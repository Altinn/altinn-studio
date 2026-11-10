const isTanStackQuery = (source) => /^@tanstack\/(react-query(?:-devtools)?|query-core)(\/|$)/.test(source);

/** Prevent imported TanStack bindings from escaping through a local export or alias. */
export const noTanStackReexports = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      reexport: 'Keep TanStack Query internals private. Export domain hooks and plain application interfaces instead.',
    },
  },
  create(context) {
    function isImportedBinding(node, seen = new Set()) {
      if (!node) {
        return false;
      }
      switch (node.type) {
        case 'Identifier': {
          let scope = context.sourceCode.getScope(node);
          let variable;
          while (scope && !variable) {
            variable = scope.set.get(node.name);
            scope = scope.upper;
          }
          if (!variable || seen.has(variable)) {
            return false;
          }
          seen.add(variable);
          return variable.defs.some((def) => {
            if (def.type === 'ImportBinding') {
              return isTanStackQuery(def.parent.source.value);
            }
            if (def.type === 'Variable') {
              return isImportedBinding(def.node.init, seen);
            }
            if (def.type === 'Type') {
              return isImportedBinding(def.node.typeAnnotation, seen);
            }
            return false;
          });
        }
        case 'TSAsExpression':
        case 'TSSatisfiesExpression':
        case 'TSNonNullExpression':
          return isImportedBinding(node.expression, seen);
        case 'TSTypeReference':
          return (
            isImportedBinding(node.typeName, seen) ||
            (node.typeArguments?.params.some((type) => isImportedBinding(type, seen)) ?? false)
          );
        case 'TSUnionType':
        case 'TSIntersectionType':
          return node.types.some((type) => isImportedBinding(type, seen));
        case 'TSIndexedAccessType':
          return isImportedBinding(node.objectType, seen);
        case 'TSInterfaceHeritage':
          return isImportedBinding(node.expression, seen);
        case 'ObjectExpression':
          return node.properties.some((property) => isImportedBinding(property.value ?? property.argument, seen));
        case 'ArrayExpression':
          return node.elements.some((element) => isImportedBinding(element, seen));
        case 'NewExpression':
          return isImportedBinding(node.callee, seen);
        case 'TSTypeQuery':
          return isImportedBinding(node.exprName, seen);
        case 'MemberExpression':
          return isImportedBinding(node.object, seen);
        case 'TSQualifiedName':
          return isImportedBinding(node.left, seen);
        default:
          return false;
      }
    }

    return {
      ExportAllDeclaration(node) {
        if (isTanStackQuery(node.source.value)) {
          context.report({ node, messageId: 'reexport' });
        }
      },
      ExportNamedDeclaration(node) {
        if (node.source && isTanStackQuery(node.source.value)) {
          context.report({ node, messageId: 'reexport' });
          return;
        }
        const declaration = node.declaration;
        const bindings =
          declaration?.type === 'VariableDeclaration'
            ? declaration.declarations.map((decl) => decl.init)
            : declaration?.type === 'TSTypeAliasDeclaration'
              ? [declaration.typeAnnotation]
              : declaration?.type === 'TSInterfaceDeclaration'
                ? declaration.extends
                : node.specifiers.map((specifier) => specifier.local);
        if (bindings.some((binding) => isImportedBinding(binding))) {
          context.report({ node, messageId: 'reexport' });
        }
      },
    };
  },
};
