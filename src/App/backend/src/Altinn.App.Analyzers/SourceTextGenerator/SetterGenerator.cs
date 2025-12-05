using System.Text;

namespace Altinn.App.Analyzers.SourceTextGenerator;

internal static class SetterGenerator
{
    public static void Generate(StringBuilder builder, ModelPathNode rootNode)
    {
        if (rootNode.Properties.Count == 0)
        {
            builder.Append(
                """

                    /// <inheritdoc />
                    public bool Set(global::System.ReadOnlySpan<char> path, object? value) => false;

                """
            );
            return;
        }
        builder.Append(
            """

                /// <inheritdoc />
                public bool Set(global::System.ReadOnlySpan<char> path, object? value)
                {
                    if (path.IsEmpty)
                    {
                        return false;
                    }

                    return SetRecursive(_dataModel, path, 0, value);
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

                    private static bool SetRecursive(
                        {{modelPathNode.ListType}}? model,
                        global::System.ReadOnlySpan<char> path,
                        int literalIndex,
                        int offset,
                        object? value
                    )
                    {
                        if (model is null || literalIndex < 0 || literalIndex >= model.Count)
                        {
                            return false;
                        }

                        {{(
                    modelPathNode.Properties.Count == 0
                        ? GenerateListElementSet(modelPathNode)
                        : "return SetRecursive(model[literalIndex], path, offset, value);"
                )}}
                    }

                """
            );
        }
        if (modelPathNode.IsJsonValueType || !generatedTypes.Add(modelPathNode.TypeName))
        {
            // Do not generate recursive setters for primitive types, or types already generated
            return;
        }

        builder.Append(
            $$"""

                private static bool SetRecursive(
                    {{modelPathNode.TypeName}}? model,
                    global::System.ReadOnlySpan<char> path,
                    int offset,
                    object? value
                )
                {
                    if (model is null || offset == -1)
                    {
                        return false;
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
                        $"            \"{child.JsonName}\" => SetRecursive(model.{child.CSharpName}, path, literalIndex, nextOffset, value),\r\n",
                    { Properties.Count: 0 } =>
                        $"            \"{child.JsonName}\" when nextOffset is -1 && literalIndex is -1 => TrySetValue(val => model.{child.CSharpName} = val, value),\r\n",
                    _ =>
                        $"            \"{child.JsonName}\" when literalIndex is -1 => SetRecursive(model.{child.CSharpName}, path, nextOffset, value),\r\n",
                }
            );
        }

        // Return false for unknown paths
        builder.Append(
            """
                        _ => false,
                    };
                }

            """
        );

        foreach (var child in modelPathNode.Properties)
        {
            GenerateRecursive(builder, child, generatedTypes);
        }
    }

    private static string GenerateListElementSet(ModelPathNode modelPathNode)
    {
        // For list elements that are primitives, we need to handle the set differently
        // Extract the element type from the list type (e.g., "List<int>" -> "int")
        var elementType = modelPathNode.TypeName;

        return @"if (offset == -1)
                        {
                            return TrySetValue<"
            + elementType
            + @">(val => model[literalIndex] = val, value);
                        }
                        return false;
";
    }
}
