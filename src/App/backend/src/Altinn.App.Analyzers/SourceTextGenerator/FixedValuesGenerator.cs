using System.Text;

namespace Altinn.App.Analyzers.SourceTextGenerator;

/// <summary>
/// Generates <c>ValidateFixedValues</c>, which compares properties with a fixed value (marked with [BindNever]
/// and initialized with a literal) against the literal from the model class.
/// </summary>
internal static class FixedValuesGenerator
{
    private const string ErrorType = "global::Altinn.App.Core.Internal.Data.FixedValueError";
    private const string ErrorList = $"global::System.Collections.Generic.List<{ErrorType}>";

    public static void Generate(StringBuilder builder, ModelPathNode rootNode)
    {
        var root = GetNodesWithFixedValues(rootNode);
        if (root is null)
        {
            builder.Append(
                $$"""

                    /// <inheritdoc />
                    public global::System.Collections.Generic.IReadOnlyList<{{ErrorType}}> ValidateFixedValues()
                    {
                        return global::System.Array.Empty<{{ErrorType}}>();
                    }

                """
            );
            return;
        }

        builder.Append(
            $$"""

                /// <inheritdoc />
                public global::System.Collections.Generic.IReadOnlyList<{{ErrorType}}> ValidateFixedValues()
                {
                    var errors =
                        new {{ErrorList}}();
                    ValidateFixedValues(_dataModel, "", errors);
                    return errors;
                }

            """
        );

        GenerateValidateFixedValues(builder, root, []);
    }

    private static void GenerateValidateFixedValues(
        StringBuilder builder,
        NodeWithFixedValues nodeWithFixedValues,
        HashSet<string> classes
    )
    {
        var node = nodeWithFixedValues.Node;
        if (!classes.Add(node.TypeName))
        {
            return;
        }

        builder.Append(
            $$"""

                private static void ValidateFixedValues(
                    {{node.TypeName}} dataModel,
                    string path,
                    {{ErrorList}} errors
                )
                {

            """
        );

        foreach (var fixedValue in node.FixedValues)
        {
            builder.Append(
                $$"""
                        if (dataModel.{{fixedValue.CSharpName}} != {{fixedValue.ValueExpression}})
                        {
                            errors.Add(
                                new {{ErrorType}}(
                                    path + "{{fixedValue.CSharpName}}",
                                    {{fixedValue.ValueDescription}},
                                    global::System.Convert.ToString(
                                        dataModel.{{fixedValue.CSharpName}},
                                        global::System.Globalization.CultureInfo.InvariantCulture
                                    )
                                )
                            );
                        }

                """
            );
        }

        foreach (var child in nodeWithFixedValues.Children)
        {
            if (child.Node.ListType is null)
            {
                builder.Append(
                    $$"""
                            if (dataModel.{{child.Node.CSharpName}} is not null)
                            {
                                ValidateFixedValues(dataModel.{{child.Node.CSharpName}}, path + "{{child.Node.JsonName}}.", errors);
                            }

                    """
                );
            }
            else
            {
                builder.Append(
                    $$"""
                            if (dataModel.{{child.Node.CSharpName}} is not null)
                            {
                                int index = 0;
                                foreach (var item in dataModel.{{child.Node.CSharpName}})
                                {
                                    if (item is not null)
                                    {
                                        ValidateFixedValues(item, $"{path}{{child.Node.JsonName}}[{index}].", errors);
                                    }
                                    index++;
                                }
                            }

                    """
                );
            }
        }

        builder.Append("    }\n");

        foreach (var child in nodeWithFixedValues.Children)
        {
            GenerateValidateFixedValues(builder, child, classes);
        }
    }

    private sealed record NodeWithFixedValues(ModelPathNode Node, List<NodeWithFixedValues> Children);

    /// <summary>
    /// Prune the tree to the nodes that have fixed values themselves or in a descendant
    /// </summary>
    private static NodeWithFixedValues? GetNodesWithFixedValues(ModelPathNode node)
    {
        var children = node.Properties.Select(GetNodesWithFixedValues).OfType<NodeWithFixedValues>().ToList();
        if (children.Count == 0 && node.FixedValues.Count == 0)
        {
            return null;
        }

        return new NodeWithFixedValues(node, children);
    }
}
