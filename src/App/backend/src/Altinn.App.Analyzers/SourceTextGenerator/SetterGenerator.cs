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
                    public bool Set(
                        global::System.ReadOnlySpan<char> path,
                        global::Altinn.App.Core.Internal.Expressions.ExpressionValue value
                    ) => false;

                """
            );
            return;
        }
        builder.Append(
            """

                /// <inheritdoc />
                public bool Set(
                    global::System.ReadOnlySpan<char> path,
                    global::Altinn.App.Core.Internal.Expressions.ExpressionValue value
                )
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
                        {{modelPathNode.ListTypeWithNullable}} model,
                        global::System.ReadOnlySpan<char> path,
                        int literalIndex,
                        int offset,
                        global::Altinn.App.Core.Internal.Expressions.ExpressionValue value
                    )
                    {
                        if (model is null || literalIndex < 0)
                        {
                            return false;
                        }

                """
            );
            // Create list elements if index is out of bounds
            // Activate if required
            // if (model.Count == literalIndex)
            // {
            //    model.Add(new {{modelPathNode.TypeName}}());
            // }

            builder.Append(
                $$"""
                        if (model.Count <= literalIndex)
                        {
                            return false;
                        }

                """
            );

            if (modelPathNode.Properties.Count == 0)
            {
                // Simple list element - direct set
                if (!modelPathNode.IsIndexableList)
                {
                    builder.Append(
                        """
                                return false;

                        """
                    );
                }
                else if (modelPathNode.IsNullable || modelPathNode.IsCSharpValueType())
                {
                    builder.Append(
                        $$"""
                                if (value.TryDeserialize<{{modelPathNode.TypeNameWithNullable}}>(out var result))
                                {
                                    model[literalIndex] = result;
                                    return true;
                                }
                                return false;

                        """
                    );
                }
                else
                {
                    builder.Append(
                        $$"""
                                if (value.TryDeserialize<{{modelPathNode.TypeNameWithNullable}}>(out var result) && result is not null)
                                {
                                    model[literalIndex] = result;
                                    return true;
                                }
                                return false;

                        """
                    );
                }
            }
            else
            {
                if (modelPathNode.IsIndexableList)
                {
                    // The path ends at the element, so replace the whole object
                    var condition = TryDeserializeCondition(
                        modelPathNode.TypeNameWithNullable,
                        modelPathNode.IsNullable,
                        "result"
                    );
                    builder.Append(
                        $$"""
                                if (offset == -1)
                                {
                                    // csharpier-ignore
                                    if ({{condition}})
                                    {
                                        model[literalIndex] = result;
                                        return true;
                                    }
                                    return false;
                                }

                        """
                    );
                }
                var itemAccessor = CollectionAccessorGenerator.GenerateAccessor(modelPathNode, "model", "literalIndex");
                builder.Append(
                    $$"""
                            var item = {{itemAccessor}};
                            return SetRecursive(item, path, offset, value);

                    """
                );
            }
            builder.Append(
                """
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
                    global::Altinn.App.Core.Internal.Expressions.ExpressionValue value
                )
                {
                    if (model is null || offset == -1)
                    {
                        return false;
                    }

                    switch (ParseSegment(path, offset, out int nextOffset, out int literalIndex))
                    {

            """
        );
        foreach (var child in modelPathNode.Properties)
        {
            if (child.ListType != null)
            {
                // List property - replace the whole list, or ensure list is created and has elements
                AppendSetWholeValue(builder, child, child.ListTypeWithNullable, child.IsNullableList);
                builder.Append(
                    $$"""
                                case "{{child.JsonName}}":
                                    return SetRecursive_WithListCreation_{{modelPathNode.Name}}_{{child.CSharpName}}(
                                        model,
                                        path,
                                        literalIndex,
                                        nextOffset,
                                        value
                                    );

                    """
                );
            }
            else if (child.Properties.Count == 0)
            {
                var resultName = $"result_{child.CSharpName}";
                // Simple property - direct set
                builder.Append(
                    $$"""
                                case "{{child.JsonName}}" when nextOffset is -1 && literalIndex is -1:
                                    if (value.TryDeserialize<{{child.TypeNameWithNullable}}>(out var {{resultName}}))
                                    {
                                        model.{{child.CSharpName}} = {{resultName}};
                                        return true;
                                    }
                                    return false;

                    """
                );
            }
            else
            {
                // Complex object property - replace the whole object, or ensure object is created
                AppendSetWholeValue(builder, child, child.TypeNameWithNullable, child.IsNullable);
                builder.Append(
                    $$"""
                                case "{{child.JsonName}}" when literalIndex is -1:
                                    return SetRecursive_WithObjectCreation_{{modelPathNode.Name}}_{{child.CSharpName}}(
                                        model,
                                        path,
                                        nextOffset,
                                        value
                                    );

                    """
                );
            }
        }

        // Return false for unknown paths
        builder.Append(
            """
                        default:
                            return false;
                    }
                }

            """
        );

        // Generate helper methods for creating intermediate objects/lists
        foreach (var child in modelPathNode.Properties)
        {
            if (child.ListType != null)
            {
                // Generate list creation helper
                var ensureCollection = child.IsIndexableList
                    ? $"model.{child.CSharpName} ??= new();"
                    : $$"""
                        if (model.{{child.CSharpName}} is null)
                                {
                                    return false;
                                }

                        """;

                builder.Append(
                    $$"""

                        private static bool SetRecursive_WithListCreation_{{modelPathNode.Name}}_{{child.CSharpName}}(
                            {{modelPathNode.TypeName}} model,
                            global::System.ReadOnlySpan<char> path,
                            int literalIndex,
                            int nextOffset,
                            global::Altinn.App.Core.Internal.Expressions.ExpressionValue value
                        )
                        {
                            {{ensureCollection}}
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
                            global::Altinn.App.Core.Internal.Expressions.ExpressionValue value
                        )
                        {
                            model.{{child.CSharpName}} ??= new();
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

    /// <summary>
    /// A case for a path that ends at a list or object property, which deserializes the value into the whole property.
    /// </summary>
    private static void AppendSetWholeValue(
        StringBuilder builder,
        ModelPathNode child,
        string? typeName,
        bool isNullable
    )
    {
        var resultName = $"result_{child.CSharpName}";
        var condition = TryDeserializeCondition(typeName, isNullable, resultName);
        // The block lets csharpier-ignore apply, as type names can be longer than the line width
        builder.Append(
            $$"""
                        case "{{child.JsonName}}" when nextOffset is -1 && literalIndex is -1:
                        {
                            // csharpier-ignore
                            if ({{condition}})
                            {
                                model.{{child.CSharpName}} = {{resultName}};
                                return true;
                            }
                            return false;
                        }

            """
        );
    }

    /// <summary>
    /// Deserializes the value into resultName, and rejects null unless the type is nullable.
    /// </summary>
    private static string TryDeserializeCondition(string? typeName, bool isNullable, string resultName) =>
        isNullable
            ? $"value.TryDeserialize<{typeName}>(out var {resultName})"
            : $"value.TryDeserialize<{typeName}>(out var {resultName}) && {resultName} is not null";
}
