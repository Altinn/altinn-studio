using System.Text;

namespace Altinn.App.Analyzers.SourceTextGenerator;

public static class GenerateJsonComment
{
    public static void Generate(StringBuilder sb, ModelPathNode rootNode)
    {
        sb.Append("\r\n");
        sb.Append("// --------------------------------------------------\r\n");
        sb.Append("// ModelPathNode as json (for debugging)\r\n");
        sb.Append("// --------------------------------------------------\r\n");
        sb.Append("//");
        var indent = "\r\n// ";
        sb.Append(indent);
        sb.Append('{');
        WriteAsJson(sb, rootNode, indent + "  ");
        sb.Append(indent);
        sb.Append("}\r\n");
    }

    private static void WriteAsJson(StringBuilder sb, ModelPathNode node, string linePrefix)
    {
        // Custom json serializer because it is problematic to use System.Text.Json in a source generator
        sb.Append(linePrefix);
        sb.Append("\"JsonName\": \"");
        sb.Append(node.JsonName);
        sb.Append("\",");
        sb.Append(linePrefix);
        sb.Append("\"CSharpName\": \"");
        sb.Append(node.CSharpName);
        sb.Append("\",");
        sb.Append(linePrefix);
        sb.Append("\"TypeName\": \"");
        sb.Append(node.TypeName);
        sb.Append("\",");
        if (node.ListType != null)
        {
            sb.Append(linePrefix);
            sb.Append("\"ListType\": \"");
            sb.Append(node.ListType);
            sb.Append("\",");
        }

        if (node.Properties.Count != 0)
        {
            sb.Append(linePrefix);
            var subIndent = linePrefix + "  ";
            var childIndent = subIndent + "  ";
            sb.Append("\"Properties\": [");
            bool first = true;
            foreach (var property in node.Properties)
            {
                if (!first)
                {
                    sb.Append(',');
                }
                first = false;
                sb.Append(subIndent);
                sb.Append('{');
                WriteAsJson(sb, property, childIndent);
                sb.Append(subIndent);
                sb.Append('}');
            }
            sb.Append(linePrefix);
            sb.Append(']');
        }
    }
}
