using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Fixtures;

// Based on: https://github.com/VerifyTests/Verify.SourceGenerators/blob/18eb1cd67ebf76803f164751ecb27397a4c11951/src/Verify.SourceGenerators/Converters/DiagnosticConverter.cs
// This converter improves the output of diagnostic locations and also include the code snippet it refers to.
internal sealed class DiagnosticJsonConverter : WriteOnlyJsonConverter<Diagnostic>
{
    public override void Write(VerifyJsonWriter writer, Diagnostic value)
    {
        writer.WriteStartObject();
        writer.WriteMember(value, value.Id, "Id");
        var descriptor = value.Descriptor;
        writer.WriteMember(value, descriptor.Title.ToString().NormalizeSlashes(), "Title");
        writer.WriteMember(value, value.Severity.ToString(), "Severity");
        writer.WriteMember(value, value.WarningLevel, "WarningLevel");
        var lineSpan = value.Location.GetLineSpan();
        // Editors count lines from 1, but Roslyn counts from 0, so we just +1
        var line = lineSpan.StartLinePosition.Line + 1;
        var column = lineSpan.StartLinePosition.Character + 1;
        writer.WriteMember(value, $"{lineSpan.Path.NormalizeSlashes()}({line},{column})", "Location");
        if (
            (value.Location.SourceTree?.TryGetText(out var text) ?? false)
            && text.GetSubText(value.Location.SourceSpan) is { } code
        )
        {
            writer.WriteMember(value, code.ToString(), "Code");
        }
        var description = descriptor.Description.ToString();
        if (!string.IsNullOrWhiteSpace(description))
        {
            writer.WriteMember(value, description.NormalizeSlashes(), "Description");
        }

        var help = descriptor.HelpLinkUri;
        if (!string.IsNullOrWhiteSpace(help))
        {
            writer.WriteMember(value, help.NormalizeSlashes(), "HelpLink");
        }

        writer.WriteMember(value, descriptor.MessageFormat.ToString().NormalizeSlashes(), "MessageFormat");
        writer.WriteMember(value, value.GetMessage().NormalizeSlashes(), "Message");
        writer.WriteMember(value, descriptor.Category, "Category");
        writer.WriteMember(value, descriptor.CustomTags, "CustomTags");
        writer.WriteEndObject();
    }
}

file static class StringExtensions
{
    // To make slashes consistent across OS in Verify snapshots..
    public static string NormalizeSlashes(this string value) => value.Replace('\\', '/');
}
