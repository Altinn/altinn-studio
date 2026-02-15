using System.Globalization;
using System.Text.RegularExpressions;

namespace WorkflowEngine.Api.Extensions;

internal static partial class StringExtensions
{
    private static readonly Regex _curlyBracedWordPattern = CurlyBracedWordPattern();

    extension(string value)
    {
        /// <summary>
        /// Formats the string template by replacing placeholders in the form {PropertyName}
        /// with corresponding property values from the provided object.
        /// </summary>
        /// <remarks>Property name matching is case-insensitive.</remarks>
        /// <param name="values">The object containing the values for replacement.</param>
        /// <param name="formatProvider">A format provider to use for string formatting.</param>
        public string FormatWith(object values, IFormatProvider formatProvider)
        {
            var type = values.GetType();
            var props = type.GetProperties();

            return _curlyBracedWordPattern.Replace(
                value,
                match =>
                {
                    var key = match.Groups[1].Value;
                    var prop = props.FirstOrDefault(p =>
                        string.Equals(p.Name, key, StringComparison.OrdinalIgnoreCase)
                    );

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
        /// <param name="values">The object containing the values for replacement.</param>
        public string FormatWith(object values) => FormatWith(value, values, CultureInfo.InvariantCulture);

        /// <summary>
        /// Converts the string to a <see cref="Uri"/> using the specified <see cref="UriKind"/>.
        /// If no <see cref="UriKind"/> is provided, defaults to <see cref="UriKind.RelativeOrAbsolute"/>.
        /// </summary>
        public Uri ToUri(UriKind? uriKind = null) => new(value, uriKind ?? UriKind.RelativeOrAbsolute);
    }

    [GeneratedRegex(@"\{(\w+)\}", RegexOptions.Compiled)]
    private static partial Regex CurlyBracedWordPattern();
}
