using System.Text;

namespace Altinn.App.Analyzers.SourceTextGenerator;

internal static class CopyGenerator
{
    public static void Generate(StringBuilder builder, ModelPathNode rootNode, string generatedWrapperClassName)
    {
        builder.Append(
            $$"""

                /// <inheritdoc />
                public global::Altinn.App.Core.Internal.Data.IFormDataWrapper Copy()
                {
                    return new {{generatedWrapperClassName}}(
                        CopyRecursive(_dataModel),
                        DataType,
                        DataElement
                    );
                }

            """
        );

        GenerateCopyFrom(builder, rootNode);
        GenerateCopyRecursive(builder, rootNode, []);
    }

    private static void GenerateCopyFrom(StringBuilder builder, ModelPathNode rootNode)
    {
        builder.Append(
            $$"""

                /// <inheritdoc />
                public void CopyFrom(object dataModel)
                {
                    if (dataModel is not {{rootNode.TypeName}} source)
                    {
                        throw new global::System.ArgumentException(
                            $"Data model must be of type {{rootNode.FullName}}, (was {dataModel?.GetType().FullName ?? "null"})"
                        );
                    }

                    if (ReferenceEquals(source, _dataModel))
                    {
                        return;
                    }

            """
        );
        if (rootNode.Properties.Count > 0)
        {
            builder.Append('\n');
        }
        foreach (var property in rootNode.Properties)
        {
            builder.Append($"        _dataModel.{property.CSharpName} = {CopyExpression(property, "source")};\n");
        }
        builder.Append("    }\n");
    }

    private static string CopyExpression(ModelPathNode property, string owner) =>
        property is { ListType: null, Properties.Count: 0 }
            ? $"{owner}.{property.CSharpName}"
            : $"CopyRecursive({owner}.{property.CSharpName})";

    private static void GenerateCopyRecursive(StringBuilder builder, ModelPathNode node, HashSet<string> classNames)
    {
        if (node.ListType is not null && classNames.Add(node.ListType))
        {
            GenerateCopyList(builder, node);
        }
        if (!classNames.Add(node.TypeName))
        {
            // Ignore repeated types
            return;
        }

        if (node.IsJsonValueType)
        {
            // Copy of value types is an assignment and is handled in the list copy method
            return;
        }
        builder.Append(
            $$"""

                [return: global::System.Diagnostics.CodeAnalysis.NotNullIfNotNull("data")]
                private static {{node.TypeName}}? CopyRecursive(
                    {{node.TypeName}}? data
                )
                {
                    if (data is null)
                    {
                        return null;
                    }


            """
        );
        if (node.Properties.Count == 0)
        {
            // A class with no properties prints prettier without an empty initializer list
            builder.Append("        return new();\n    }\n");
        }
        else
        {
            builder.Append(
                """
                        return new()
                        {
                            // Initialize properties

                """
            );
            foreach (var property in node.Properties)
            {
                builder.Append($"            {property.CSharpName} = {CopyExpression(property, "data")},\n");
            }

            builder.Append("        };\n    }\n");
        }

        foreach (var recursiveChild in node.Properties.Where(c => c.ListType is not null || !c.IsJsonValueType))
        {
            GenerateCopyRecursive(builder, recursiveChild, classNames);
        }
    }

    private static void GenerateCopyList(StringBuilder builder, ModelPathNode node)
    {
        builder.Append(
            $$"""

                [return: global::System.Diagnostics.CodeAnalysis.NotNullIfNotNull("list")]
                private static {{node.ListTypeWithNullable}} CopyRecursive(
                    {{node.ListTypeWithNullable}} list
                )
                {
                    if (list is null)
                    {
                        return null!;
                    }
                    // csharpier-ignore
                    {{node.ListType}} result = new (list.Count);

                    foreach (var item in list)
                    {
                        result.Add({{(node.IsJsonValueType ? "item" : "CopyRecursive(item)")}});
                    }

                    return result;
                }

            """
        );
    }
}
