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
        if (modelPathNode.Properties.Count == 0)
        {
            // Do not generate for primitive types
            return;
        }

        if (modelPathNode.ListType != null && generatedTypes.Add(modelPathNode.ListType))
        {
            builder.Append(
                $$"""

                    private static object? GetRecursive(
                        {{modelPathNode.ListType}}? model,
                        global::System.ReadOnlySpan<char> path,
                        int literalIndex,
                        int offset
                    )
                    {
                        if (model is null || literalIndex < 0 || literalIndex >= model.Count)
                        {
                            return null;
                        }

                        return GetRecursive(model[literalIndex], path, offset);
                    }

                """
            );
        }

        if (!generatedTypes.Add(modelPathNode.TypeName))
        {
            // Do not generate the same type twice
            return;
        }

        builder.Append(
            $$"""

                private static object? GetRecursive(
                    {{modelPathNode.TypeName}}? model,
                    global::System.ReadOnlySpan<char> path,
                    int offset
                )
                {
                    if(model is null)
                    {
                        return null;
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
                    { Properties.Count: 0 } =>
                        $"            \"{child.JsonName}\" when nextOffset is -1 && literalIndex is -1 => model.{child.CSharpName},\r\n",
                    { ListType: not null } =>
                        $"            \"{child.JsonName}\" when nextOffset > -1 && literalIndex > -1 => GetRecursive(model.{child.CSharpName}, path, literalIndex, nextOffset),\r\n",
                    _ =>
                        $"            \"{child.JsonName}\" when nextOffset > -1 && literalIndex is -1 => GetRecursive(model.{child.CSharpName}, path, nextOffset),\r\n",
                }
            );
        }

        builder.Append(
            """
                        "" => model,
                        // _ => throw new global::System.ArgumentException("{path} is not a valid path."),
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
