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
                else
                {
                    AppendSetElement(builder, modelPathNode, indent: "        ");
                }
            }
            else
            {
                if (modelPathNode.IsIndexableList)
                {
                    // The path ends at the element, so replace the whole object
                    builder.Append(
                        """
                                if (offset == -1)
                                {

                        """
                    );
                    AppendSetElement(builder, modelPathNode, indent: "            ");
                    builder.Append(
                        """
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
        var nullForgiving = NullForgiving(isNullable, isValueType: false);
        // The block lets csharpier-ignore apply, as type names can be longer than the line width
        builder.Append(
            $$"""
                        case "{{child.JsonName}}" when nextOffset is -1 && literalIndex is -1:
                        {
                            // csharpier-ignore
                            if (value.TryDeserialize<{{typeName}}>(out var {{resultName}}))
                            {
                                model.{{child.CSharpName}} = {{resultName}}{{nullForgiving}};
                                return true;
                            }
                            return false;
                        }

            """
        );
    }

    /// <summary>
    /// Deserializes the value into the element at literalIndex of the list in "model".
    /// </summary>
    private static void AppendSetElement(StringBuilder builder, ModelPathNode element, string indent)
    {
        var nullForgiving = NullForgiving(element.IsNullable, element.IsCSharpValueType());
        if (element.Properties.Count > 0)
        {
            // Type names of objects can be longer than the line width
            builder.Append(
                $$"""
                {{indent}}// csharpier-ignore

                """
            );
        }
        builder.Append(
            $$"""
            {{indent}}if (value.TryDeserialize<{{element.TypeNameWithNullable}}>(out var result))
            {{indent}}{
            {{indent}}    model[literalIndex] = result{{nullForgiving}};
            {{indent}}    return true;
            {{indent}}}
            {{indent}}return false;

            """
        );
    }

    /// <summary>
    /// Null clears a reference type property or element, like it does in ReflectionFormDataWrapper, also when
    /// the model does not annotate it as nullable (most models are compiled with nullable disabled).
    /// </summary>
    internal static string NullForgiving(bool isNullable, bool isValueType) => isNullable || isValueType ? "" : "!";
}
