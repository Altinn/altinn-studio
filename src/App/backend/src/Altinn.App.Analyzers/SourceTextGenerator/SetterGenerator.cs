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
                        if (model is null || literalIndex < 0)
                        {
                            return false;
                        }

                        // Create list elements if index is out of bounds
                        while (model.Count <= literalIndex)
                        {
                            try
                            {
                                model.Add(global::System.Activator.CreateInstance<{{modelPathNode.TypeName}}>());
                            }
                            catch
                            {
                                return false;
                            }
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

                    var segment = ParseSegment(path, offset, out int nextOffset, out int literalIndex);
                    return segment switch
                    {

            """
        );
        foreach (var child in modelPathNode.Properties)
        {
            if (child.ListType != null)
            {
                // List property - need to ensure list is created and has elements
                builder.Append(
                    $$"""
                                "{{child.JsonName}}" => SetRecursive_WithListCreation_{{modelPathNode.Name}}_{{child.CSharpName}}(model, path, literalIndex, nextOffset, value),

                    """
                );
            }
            else if (child.Properties.Count == 0)
            {
                // Simple property - direct set
                builder.Append(
                    $"            \"{child.JsonName}\" when nextOffset is -1 && literalIndex is -1 => TrySetValue<{child.TypeName}>(val => model.{child.CSharpName} = val, value),\r\n"
                );
            }
            else
            {
                // Complex object property - need to ensure object is created
                builder.Append(
                    $$"""
                                "{{child.JsonName}}" when literalIndex is -1 => SetRecursive_WithObjectCreation_{{modelPathNode.Name}}_{{child.CSharpName}}(model, path, nextOffset, value),

                    """
                );
            }
        }

        // Return false for unknown paths
        builder.Append(
            """
                        _ => false,
                    };
                }

            """
        );

        // Generate helper methods for creating intermediate objects/lists
        foreach (var child in modelPathNode.Properties)
        {
            if (child.ListType != null)
            {
                // Generate list creation helper
                builder.Append(
                    $$"""

                        private static bool SetRecursive_WithListCreation_{{modelPathNode.Name}}_{{child.CSharpName}}(
                            {{modelPathNode.TypeName}} model,
                            global::System.ReadOnlySpan<char> path,
                            int literalIndex,
                            int nextOffset,
                            object? value
                        )
                        {
                            if (model.{{child.CSharpName}} is null)
                            {
                                try
                                {
                                    model.{{child.CSharpName}} = new {{child.ListType}}();
                                }
                                catch
                                {
                                    return false;
                                }
                            }
                            return SetRecursive(model.{{child.CSharpName}}, path, literalIndex, nextOffset, value);
                        }

                    """
                );
            }
            else if (child.Properties.Count > 0)
            {
                // Generate object creation helper
                builder.Append(
                    $$"""

                        private static bool SetRecursive_WithObjectCreation_{{modelPathNode.Name}}_{{child.CSharpName}}(
                            {{modelPathNode.TypeName}} model,
                            global::System.ReadOnlySpan<char> path,
                            int nextOffset,
                            object? value
                        )
                        {
                            if (model.{{child.CSharpName}} is null)
                            {
                                try
                                {
                                    model.{{child.CSharpName}} = global::System.Activator.CreateInstance<{{child.TypeName}}>();
                                }
                                catch
                                {
                                    return false;
                                }
                            }
                            return SetRecursive(model.{{child.CSharpName}}, path, nextOffset, value);
                        }

                    """
                );
            }
        }

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
