using System.Text;

namespace Altinn.App.Analyzers.SourceTextGenerator;

internal static class AddRowGenerator
{
    public static void Generate(StringBuilder builder, ModelPathNode rootNode)
    {
        if (rootNode.Properties.Count == 0)
        {
            builder.Append(
                """

                    /// <inheritdoc />
                    public bool AddRow(
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
                public bool AddRow(
                    global::System.ReadOnlySpan<char> path,
                    global::Altinn.App.Core.Internal.Expressions.ExpressionValue value
                )
                {
                    if (path.IsEmpty)
                    {
                        return false;
                    }

                    return AddRowRecursive(_dataModel, path, 0, value);
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
        if (
            modelPathNode.ListType != null
            && modelPathNode.Properties.Count > 0
            && generatedTypes.Add(modelPathNode.ListType)
        )
        {
            // The path continues into a row of this list
            var itemAccessor = CollectionAccessorGenerator.GenerateAccessor(modelPathNode, "model", "literalIndex");
            builder.Append(
                $$"""

                    private static bool AddRowRecursive(
                        {{modelPathNode.ListTypeWithNullable}} model,
                        global::System.ReadOnlySpan<char> path,
                        int literalIndex,
                        int offset,
                        global::Altinn.App.Core.Internal.Expressions.ExpressionValue value
                    )
                    {
                        if (model is null || literalIndex < 0 || offset == -1)
                        {
                            return false;
                        }
                        if (model.Count <= literalIndex)
                        {
                            return false;
                        }
                        var item = {{itemAccessor}};
                        return AddRowRecursive(item, path, offset, value);
                    }

                """
            );
        }
        if (modelPathNode.IsJsonValueType || !generatedTypes.Add(modelPathNode.TypeName))
        {
            // Do not generate recursive methods for primitive types, or types already generated
            return;
        }

        builder.Append(
            $$"""

                private static bool AddRowRecursive(
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
                if (child.IsIndexableList)
                {
                    // The path ends at the list, so append the value as a row (creating the list when it is null)
                    var resultName = $"result_{child.CSharpName}";
                    var nullForgiving = SetterGenerator.NullForgiving(child.IsNullable, child.IsCSharpValueType());
                    // The block lets csharpier-ignore apply, as type names can be longer than the line width
                    builder.Append(
                        $$"""
                                    case "{{child.JsonName}}" when nextOffset is -1 && literalIndex is -1:
                                    {
                                        // csharpier-ignore
                                        if (value.TryDeserialize<{{child.TypeNameWithNullable}}>(out var {{resultName}}))
                                        {
                                            model.{{child.CSharpName}} ??= new();
                                            model.{{child.CSharpName}}.Add({{resultName}}{{nullForgiving}});
                                            return true;
                                        }
                                        return false;
                                    }

                        """
                    );
                }
                if (child.Properties.Count > 0)
                {
                    builder.Append(
                        $$"""
                                    case "{{child.JsonName}}" when literalIndex is not -1:
                                        return AddRowRecursive(model.{{child.CSharpName}}, path, literalIndex, nextOffset, value);

                        """
                    );
                }
            }
            else if (child.Properties.Count > 0)
            {
                // The path continues into the object, which is created when it is null
                builder.Append(
                    $$"""
                                case "{{child.JsonName}}" when literalIndex is -1 && nextOffset is not -1:
                                    model.{{child.CSharpName}} ??= new();
                                    return AddRowRecursive(model.{{child.CSharpName}}, path, nextOffset, value);

                    """
                );
            }
        }

        // Return false for unknown paths, and paths that end at something other than a list
        builder.Append(
            """
                        default:
                            return false;
                    }
                }

            """
        );

        foreach (var child in modelPathNode.Properties)
        {
            GenerateRecursive(builder, child, generatedTypes);
        }
    }
}
