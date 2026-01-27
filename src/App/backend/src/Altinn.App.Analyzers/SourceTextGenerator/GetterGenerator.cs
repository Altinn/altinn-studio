using System.Text;

namespace Altinn.App.Analyzers.SourceTextGenerator;

internal static class GetterGenerator
{
    public static void Generate(StringBuilder builder, ModelPathNode rootNode)
    {
        if (rootNode.Properties.Count == 0)
        {
            builder.Append(
                """

                    /// <inheritdoc />
                    public object? Get(global::System.ReadOnlySpan<char> path) => null;

                """
            );
            return;
        }
        builder.Append(
            """

                /// <inheritdoc />
                public object? Get(global::System.ReadOnlySpan<char> path)
                {
                    if (path.IsEmpty)
                    {
                        return null;
                    }

                    return GetRecursive(_dataModel, path, 0);
                }

            """
        );

        GenerateRecursive(builder, rootNode, new HashSet<string>(StringComparer.Ordinal));
    }

    private static void GenerateRecursive(
        StringBuilder builder,
        ModelPathNode modelPathNode,
        HashSet<string> generatedTypes
    )
    {
        if (modelPathNode.ListType != null && generatedTypes.Add(modelPathNode.ListType))
        {
            builder.Append(
                $$"""

                    private static object? GetRecursive(
                        {{modelPathNode.ListTypeWithNullable}} model,
                        global::System.ReadOnlySpan<char> path,
                        int literalIndex,
                        int offset
                    )
                    {
                        if (literalIndex == -1)
                        {
                            return model;
                        }

                        if (model is null || literalIndex < 0 || literalIndex >= model.Count)
                        {
                            return null;
                        }

                        {{(
                    modelPathNode.Properties.Count == 0
                        ? "return model[literalIndex];"
                        : "return GetRecursive(model[literalIndex], path, offset);"
                )}}
                    }

                """
            );
        }
        if (modelPathNode.IsJsonValueType || !generatedTypes.Add(modelPathNode.TypeName))
        {
            // Do not generate recursive getters for primitive types, or types already generated
            return;
        }

        builder.Append(
            $$"""

                private static object? GetRecursive(
                    {{modelPathNode.TypeNameWithNullable}} model,
                    global::System.ReadOnlySpan<char> path,
                    int offset
                )
                {
                    if (model is null || offset == -1)
                    {
                        return model;
                    }

                    return ParseSegment(path, offset, out int nextOffset, out int literalIndex) switch
                    {

            """
        );
        foreach (var child in modelPathNode.Properties)
        {
            builder.Append(
                child switch
                {
                    { ListType: not null } =>
                        $"            \"{child.JsonName}\" => GetRecursive(model.{child.CSharpName}, path, literalIndex, nextOffset),\r\n",
                    { Properties.Count: 0 } =>
                        $"            \"{child.JsonName}\" when nextOffset is -1 && literalIndex is -1 => model.{child.CSharpName},\r\n",
                    _ =>
                        $"            \"{child.JsonName}\" when literalIndex is -1 => GetRecursive(model.{child.CSharpName}, path, nextOffset),\r\n",
                }
            );
        }

        // Return null for unknown paths
        // Could be an exception when we have proper validation
        builder.Append(
            """
                        // _ => throw new global::Altinn.App.Core.Helpers.DataModel.DataModelException($"{path} is not a valid path."),
                        _ => null,
                    };
                }

            """
        );

        foreach (var child in modelPathNode.Properties)
        {
            GenerateRecursive(builder, child, generatedTypes);
        }
    }
}
