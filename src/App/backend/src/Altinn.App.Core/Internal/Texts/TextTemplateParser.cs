using System.Collections.Immutable;
using System.Text.RegularExpressions;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// Splits a text at its <c>{name}</c> placeholders into a <see cref="TextTemplate"/>.
/// </summary>
internal static partial class TextTemplateParser
{
    /// <summary>
    /// Parses <paramref name="text"/>. <paramref name="variableFor"/> returns the variable for a placeholder name, or
    /// null to keep the placeholder as literal text.
    /// </summary>
    public static TextTemplate Parse(string text, Func<string, TextVariableSource?> variableFor)
    {
        var segments = ImmutableArray.CreateBuilder<string>();
        var variables = ImmutableArray.CreateBuilder<TextVariableSource>();
        var segmentStart = 0;
        foreach (Match match in PlaceholderRegex().Matches(text))
        {
            if (variableFor(match.Groups[1].Value) is not { } variable)
            {
                continue;
            }

            segments.Add(text[segmentStart..match.Index]);
            variables.Add(variable);
            segmentStart = match.Index + match.Length;
        }
        segments.Add(text[segmentStart..]);

        return new TextTemplate(segments.ToImmutable(), variables.ToImmutable());
    }

    [GeneratedRegex(@"\{([^{}]+)\}")]
    private static partial Regex PlaceholderRegex();
}
