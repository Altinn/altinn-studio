using System;
using System.Globalization;
using Manatee.Json;
using Manatee.Json.Schema;

namespace Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json.FormatValidators
{
    /// <summary>
    /// Handles `yearMonth` format validation by attempting to parse against YYYY-MM format.
    /// </summary>
    public class YearMonthFormatValidator : IFormatValidator
    {
        /// <summary>
        /// A singleton instance of the validator.
        /// </summary>
        public static IFormatValidator Instance { get; } = new YearMonthFormatValidator();

        /// <summary>
        /// Gets the format this validator handles.
        /// </summary>
        public string Format => "year-month";

        /// <summary>
        /// Gets the JSON Schema draft versions supported by this format.
        /// </summary>
        public JsonSchemaVersion SupportedBy => JsonSchemaVersion.All;

        /// <summary>
        /// Validates a value.
        /// </summary>
        /// <param name="value">The value to validate.</param>
        /// <returns>True if <paramref name="value"/> matches the format; otherwise false.</returns>
        public virtual bool Validate(JsonValue value)
        {
            return value.Type != JsonValueType.String ||
                   DateTimeOffset.TryParseExact(value.String, "yyyy'-'MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
        }
    }
}
