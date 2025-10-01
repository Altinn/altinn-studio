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
                    return new {{generatedWrapperClassName}}(CopyRecursive(_dataModel));
                }

            """
        );

        GenerateCopyRecursive(builder, rootNode, []);
    }

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
            builder.Append("        return new();\r\n    }\r\n");
        }
        else
        {
            builder.Append("        return new()\r\n        {\r\n");
            foreach (var property in node.Properties)
            {
                builder.Append(
                    property.Properties.Count == 0
                        ? $"            {property.CSharpName} = data.{property.CSharpName},\r\n"
                        : $"            {property.CSharpName} = CopyRecursive(data.{property.CSharpName}),\r\n"
                );
            }

            builder.Append("        };\r\n    }\r\n");
        }

        foreach (var recursiveChild in node.Properties.Where(c => c.Properties.Count != 0))
        {
            GenerateCopyRecursive(builder, recursiveChild, classNames);
        }
    }

    private static void GenerateCopyList(StringBuilder builder, ModelPathNode node)
    {
        builder.Append(
            $$"""

                [return: global::System.Diagnostics.CodeAnalysis.NotNullIfNotNull("list")]
                private static {{node.ListType}}? CopyRecursive(
                    {{node.ListType}}? list
                )
                {
                    if (list is null)
                    {
                        return null;
                    }

                    {{node.ListType}} result = new(list.Count);
                    foreach (var item in list)
                    {
                        result.Add(CopyRecursive(item));
                    }

                    return result;
                }

            """
        );
    }
}
