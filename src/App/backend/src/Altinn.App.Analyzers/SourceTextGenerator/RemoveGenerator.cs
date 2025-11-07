using System.Text;

namespace Altinn.App.Analyzers.SourceTextGenerator;

internal static class RemoveGenerator
{
    public static void Generate(StringBuilder builder, ModelPathNode rootNode)
    {
        if (rootNode.Properties.Count == 0)
        {
            builder.Append(
                """

                    /// <inheritdoc />
                    public void RemoveField(global::System.ReadOnlySpan<char> path, global::Altinn.App.Core.Helpers.RowRemovalOption rowRemovalOption) { }

                """
            );
            return;
        }
        builder.Append(
            """

                /// <inheritdoc />
                public void RemoveField(global::System.ReadOnlySpan<char> path, global::Altinn.App.Core.Helpers.RowRemovalOption rowRemovalOption)
                {
                    if (path.IsEmpty)
                    {
                        return;
                    }

                    RemoveRecursive(_dataModel, path, 0, rowRemovalOption);
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

                    private static void RemoveRecursive(
                        {{modelPathNode.ListType}}? model,
                        global::System.ReadOnlySpan<char> path,
                        int offset,
                        int index,
                        global::Altinn.App.Core.Helpers.RowRemovalOption rowRemovalOption
                    )
                    {
                        if (model is null)
                        {
                            return;
                        }
                        if (index < 0 || index >= model.Count)
                        {
                            return;
                        }
                        if (offset == -1)
                        {
                            switch (rowRemovalOption)
                            {
                                case global::Altinn.App.Core.Helpers.RowRemovalOption.DeleteRow:
                                    model.RemoveAt(index);
                                    break;
                                case global::Altinn.App.Core.Helpers.RowRemovalOption.SetToNull:
                                    model[index] = default!;
                                    break;
                            }
                        }
                """
            );
            if (modelPathNode.Properties.Count > 0)
            {
                // Don't recurs into primitives (classes with no properties)
                builder.Append(
                    """

                            else
                            {
                                RemoveRecursive(model[index], path, offset, rowRemovalOption);
                            }
                    """
                );
            }
            builder.Append(
                """

                    }

                """
            );
        }
        if (modelPathNode.Properties.Count == 0)
        {
            // Do not generate for primitive types
            return;
        }

        if (!generatedTypes.Add(modelPathNode.TypeName))
        {
            // Do not generate the same type twice
            return;
        }
        builder.Append(
            $$"""

                private static void RemoveRecursive(
                    {{modelPathNode.TypeName}}? model,
                    global::System.ReadOnlySpan<char> path,
                    int offset,
                    global::Altinn.App.Core.Helpers.RowRemovalOption rowRemovalOption
                )
                {
                    if (model is null)
                    {
                        return;
                    }
                    switch (ParseSegment(path, offset, out int nextOffset, out int literalIndex))
                    {

            """
        );
        foreach (var child in modelPathNode.Properties)
        {
            if (child.IsAltinnRowId())
            {
                // altinnRowId isn't nullable, and it is set on its own schedule.
                continue;
            }

            builder.Append(
                $"""
                            case "{child.JsonName}" when (nextOffset is -1) && (literalIndex is -1):
                                model.{child.CSharpName} = default;
                                break;

                """
            );
            if (child.ListType is not null)
            {
                builder.Append(
                    $"""
                                case "{child.JsonName}":
                                    RemoveRecursive(model.{child.CSharpName}, path, nextOffset, literalIndex, rowRemovalOption);
                                    break;

                    """
                );
            }
            else if (child.Properties.Count != 0)
            {
                builder.Append(
                    $"""
                                case "{child.JsonName}":
                                    RemoveRecursive(model.{child.CSharpName}, path, nextOffset, rowRemovalOption);
                                    break;

                    """
                );
            }
        }

        builder.Append(
            """
                        default:
                            // throw new ArgumentException("{path} is not a valid path.");
                            return;
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
