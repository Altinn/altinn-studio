/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  name: 'no-feature-internal-imports',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing from internal paths of a feature. Outside a feature, only the feature index may be imported.',
    },
    schema: [],
    messages: {
      noInternalImport:
        'Do not import from "{{importPath}}". Use the feature index "nextsrc/features/{{feature}}" instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    // Matches e.g. "nextsrc/features/instance/queries/instance.queries"
    const DEEP_FEATURE_IMPORT = /^nextsrc\/features\/([^/]+)\/.+/;

    // Matches the feature folder of the current file, e.g. ".../nextsrc/features/instance/..."
    const CURRENT_FILE_FEATURE = /nextsrc\/features\/([^/]+)\//;

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const importMatch = importPath.match(DEEP_FEATURE_IMPORT);
        if (!importMatch) {
          return;
        }

        const importedFeature = importMatch[1];

        // Allow intra-feature imports: a file inside "instance" may import
        // from other paths inside "instance".
        const currentFile = context.getFilename();
        const currentMatch = currentFile.match(CURRENT_FILE_FEATURE);
        if (currentMatch?.[1] === importedFeature) {
          return;
        }

        context.report({
          node,
          messageId: 'noInternalImport',
          data: { importPath, feature: importedFeature },
        });
      },
    };
  },
};
