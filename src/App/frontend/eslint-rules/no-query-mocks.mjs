import path from 'node:path';

/** Keep the real query/cache lifecycle in tests; inject typed API client fakes instead. */
export const noQueryMocks = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      boundary: 'Inject API method fakes with apis or createQueryTestWrapper. Keep query hooks and providers real.',
      transport: 'Inject typed API method fakes in feature tests. Mock HTTP only when testing the API client itself.',
    },
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/');
    const frontend = filename.slice(0, filename.lastIndexOf('/src/') + 1);
    const isTransportTest = /\/src\/(core\/api-client|utils\/network)\//.test(filename);

    function sourcePath(source) {
      if (source.startsWith('.')) {
        const resolved = path.resolve(path.dirname(context.filename), source).replaceAll('\\', '/');
        return resolved.startsWith(frontend) ? resolved.slice(frontend.length) : source;
      }
      return source;
    }

    function check(source, node) {
      const target = sourcePath(source);
      if (
        /^@tanstack\/(react-query(?:-devtools)?|query-core)(\/|$)/.test(target) ||
        /^src\/core\/queries(\/|$)/.test(target) ||
        /^src\/core\/contexts\/ApiProvider(?:\.[jt]sx?)?$/.test(target) ||
        /^src\/features\/instance\/(useProcessQuery|InstanceContext)(?:\.[jt]sx?)?$/.test(target) ||
        /^src\/core\/api-client(\/|$)/.test(target)
      ) {
        context.report({ node, messageId: 'boundary' });
      } else if (
        !isTransportTest &&
        (/^axios(?:\/|$)/.test(target) || /^src\/utils\/network\//.test(target) || target === 'src/core/axiosInstance')
      ) {
        context.report({ node, messageId: 'transport' });
      }
    }

    function importedSource(node) {
      if (node.type === 'MemberExpression') {
        return importedSource(node.object);
      }
      if (node.type !== 'Identifier') {
        return undefined;
      }
      let scope = context.sourceCode.getScope(node);
      while (scope) {
        const variable = scope.set.get(node.name);
        if (variable) {
          return variable.defs.find((def) => def.type === 'ImportBinding')?.parent.source.value;
        }
        scope = scope.upper;
      }
      return undefined;
    }

    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          !['vi', 'vitest'].includes(node.callee.object.name)
        ) {
          return;
        }
        const method = node.callee.property.name;
        const first = node.arguments[0];
        if (['mock', 'doMock'].includes(method)) {
          const source = first?.type === 'ImportExpression' ? first.source : first;
          if (source?.type === 'Literal' && typeof source.value === 'string') {
            check(source.value, node);
          }
        } else if (method === 'spyOn' && first) {
          const source = importedSource(first);
          if (source) {
            check(source, node);
          }
        }
      },
    };
  },
};
