using System.Globalization;
using System.Text.RegularExpressions;

namespace Altinn.App.ProcessEngine.Extensions;

internal static partial class StringExtensions
{
    private static readonly Regex _curlyBracedWordPattern = CurlyBracedWordPattern();

    /// <summary>
    /// Formats the string template by replacing placeholders in the form {PropertyName}
    /// with corresponding property values from the provided object.
    /// </summary>
    /// <remarks>Property name matching is case-insensitive.</remarks>
    /// <param name="template">The template string.</param>
    /// <param name="values">The object containing the values for replacement.</param>
    /// <param name="formatProvider">A format provider to use for string formatting.</param>
    public static string FormatWith(this string template, object values, IFormatProvider formatProvider)
    {
        var type = values.GetType();
        var props = type.GetProperties();

        return _curlyBracedWordPattern.Replace(
            template,
            match =>
            {
                var key = match.Groups[1].Value;
                var prop = props.FirstOrDefault(p => string.Equals(p.Name, key, StringComparison.OrdinalIgnoreCase));

                if (prop is null)
                    throw new InvalidOperationException($"No value provided for placeholder '{key}'");

                return prop.GetValue(values) switch
                {
                    null => "",
                    IFormattable formattable => formattable.ToString(null, formatProvider),
                    var value => value.ToString() ?? "",
                };
            }
        );
    }

    /// <summary>
    /// <inheritdoc cref="FormatWith(string, object, IFormatProvider)"/>
    /// </summary>
    /// <remarks>Uses <see cref="CultureInfo.InvariantCulture"/> as the format provider.</remarks>
    /// <param name="template">The template string.</param>
    /// <param name="values">The object containing the values for replacement.</param>
    public static string FormatWith(this string template, object values) =>
        FormatWith(template, values, CultureInfo.InvariantCulture);

    [GeneratedRegex(@"\{(\w+)\}", RegexOptions.Compiled)]
    private static partial Regex CurlyBracedWordPattern();
}
