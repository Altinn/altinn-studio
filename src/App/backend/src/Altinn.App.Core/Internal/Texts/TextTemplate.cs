using System.Collections.Immutable;
using System.Text;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// One text in one language, split at its placeholders: <c>Segments[0]</c>, value 0, <c>Segments[1]</c>, value 1,
/// and so on, ending with the last segment.
/// </summary>
internal sealed class TextTemplate
{
    /// <summary>
    /// Creates a template from the parts around its placeholders and the variable for each placeholder.
    /// </summary>
    /// <exception cref="ArgumentException">There is not exactly one more segment than variables.</exception>
    public TextTemplate(ImmutableArray<string> segments, ImmutableArray<TextVariableSource> variables)
    {
        if (segments.Length != variables.Length + 1)
        {
            throw new ArgumentException(
                $"A template has one more segment than variables, but got {segments.Length} segments and {variables.Length} variables",
                nameof(segments)
            );
        }

        Segments = segments;
        Variables = variables;
    }

    /// <summary>
    /// The text before, between and after the placeholders.
    /// </summary>
    public ImmutableArray<string> Segments { get; }

    /// <summary>
    /// The variable for each placeholder, in the order they occur. A placeholder that occurs twice is here twice.
    /// </summary>
    public ImmutableArray<TextVariableSource> Variables { get; }

    /// <summary>
    /// Joins the segments with the values in between. A value is never searched for placeholders.
    /// </summary>
    /// <exception cref="ArgumentException">There is not one value per variable.</exception>
    public string Apply(ReadOnlySpan<string> values)
    {
        if (values.Length != Variables.Length)
        {
            throw new ArgumentException(
                $"The template has {Variables.Length} variables, but got {values.Length} values",
                nameof(values)
            );
        }

        var text = new StringBuilder(Segments[0]);
        for (var i = 0; i < values.Length; i++)
        {
            text.Append(values[i]).Append(Segments[i + 1]);
        }
        return text.ToString();
    }
}
