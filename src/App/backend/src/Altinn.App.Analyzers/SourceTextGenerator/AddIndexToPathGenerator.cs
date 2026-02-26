using System.Text;

namespace Altinn.App.Analyzers.SourceTextGenerator;

internal static class AddIndexToPathGenerator
{
    public static void Generate(StringBuilder builder, ModelPathNode rootNode)
    {
        builder.Append(
            $$"""

                /// <inheritdoc />
                public global::System.ReadOnlySpan<char> AddIndexToPath(
                    global::System.ReadOnlySpan<char> path,
                    global::System.ReadOnlySpan<int> rowIndexes,
                    global::System.Span<char> buffer
                )
                {
                    if (path.IsEmpty)
                    {
                        return global::System.ReadOnlySpan<char>.Empty;
                    }

                    var bufferOffset = 0;
                    var pathOffset = 0;

                    AddIndexToPathRecursive_{{rootNode.Name}}(
                        path,
                        pathOffset,
                        rowIndexes,
                        buffer,
                        ref bufferOffset
                    );

                    return buffer[..bufferOffset];
                }

            """
        );
        GenerateRecursiveMethod(builder, rootNode, new HashSet<string>(StringComparer.Ordinal));
    }

    private static void GenerateRecursiveMethod(
        StringBuilder builder,
        ModelPathNode node,
        HashSet<string> generatedTypeNames
    )
    {
        if (!generatedTypeNames.Add(node.TypeName))
        {
            // Already generated this method
            return;
        }
        builder.Append(
            $$"""

                private void AddIndexToPathRecursive_{{node.Name}}(
                    global::System.ReadOnlySpan<char> path,
                    int pathOffset,
                    global::System.ReadOnlySpan<int> rowIndexes,
                    global::System.Span<char> buffer,
                    ref int bufferOffset
                )
                {
                    if (bufferOffset > 0)
                    {
                        buffer[bufferOffset++] = '.';
                    }
                    var segment = ParseSegment(path, pathOffset, out pathOffset, out int literalIndex);
                    switch (segment)
                    {

            """
        );

        foreach (var child in node.Properties)
        {
            builder.Append(
                $$"""
                            case "{{child.JsonName}}":
                                segment.CopyTo(buffer.Slice(bufferOffset));
                                bufferOffset += {{child.JsonName.Length}};

                """
            );
            if (child.ListType is not null)
            {
                builder.Append(
                    """

                                    if (literalIndex != -1)
                                    {
                                        // Copy index from path to buffer
                                        buffer[bufferOffset++] = '[';
                                        if (!literalIndex.TryFormat(buffer[bufferOffset..], out int charsWritten))
                                        {
                                            throw new global::System.ArgumentException(
                                                $"Buffer too small to write index for {path}."
                                            );
                                        }

                                        bufferOffset += charsWritten;
                                        buffer[bufferOffset++] = ']';
                                        rowIndexes = default;
                                    }
                                    else if (rowIndexes.Length >= 1)
                                    {
                                        // Write index from rowIndexes to buffer
                                        buffer[bufferOffset++] = '[';
                                        if (!rowIndexes[0].TryFormat(buffer[bufferOffset..], out int charsWritten))
                                        {
                                            throw new global::System.ArgumentException(
                                                $"Buffer too small to write index for {path}."
                                            );
                                        }
                                        bufferOffset += charsWritten;
                                        buffer[bufferOffset++] = ']';
                                        rowIndexes = rowIndexes.Slice(1);
                                    }
                                    else if (pathOffset == -1)
                                    {
                                        // No more segments in the path, and the last part is valid in a list
                                        // without index (e.g. "model.listProperty" is valid, but "model.listProperty.val" needs an index)
                                        return;
                                    }
                                    else
                                    {
                                        // No index to write, but there are more segments in the path
                                        // thus the path is not valid
                                        bufferOffset = 0;
                                        return;
                                    }

                    """
                );
            }
            if (!child.IsJsonValueType)
            {
                builder.Append(
                    $$"""
                                    if (pathOffset != -1)
                                    {
                                        AddIndexToPathRecursive_{{child.Name}}(
                                            path,
                                            pathOffset,
                                            rowIndexes,
                                            buffer,
                                            ref bufferOffset
                                        );
                                    }

                    """
                );
            }

            builder.Append("                return;\r\n");
        }

        builder.Append(
            """
                        default:
                            bufferOffset = 0;
                            return;
                    }
                }

            """
        );
        foreach (var child in node.Properties.Where(c => !c.IsJsonValueType))
        {
            GenerateRecursiveMethod(builder, child, generatedTypeNames);
        }
    }
}
