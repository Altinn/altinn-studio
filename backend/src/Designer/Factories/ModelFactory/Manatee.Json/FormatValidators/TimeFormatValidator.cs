using System;
using System.Globalization;
using Manatee.Json;
using Manatee.Json.Schema;

namespace Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json.FormatValidators
{
    /// <summary>
    /// Handles `time` format validation by attempting to parse against several formats (ISO-8601 compatible).
    /// </summary>
    /// <remarks>
    /// The expected formats are:
    /// 
    ///   - `HH':'mm':'ss'.'fffffffK`
    ///   - `HH':'mm':'ss'.'ffffffK`
    ///   - `HH':'mm':'ss'.'fffffK`
    ///   - `HH':'mm':'ss'.'ffffK`
    ///   - `HH':'mm':'ss'.'fffK`
    ///   - `HH':'mm':'ss'.'ffK`
    ///   - `HH':'mm':'ss'.'fK`
    ///   - `HH':'mm':'ssK`
    ///   - `HH':'mm':'ss`
    /// </remarks>
    public class TimeFormatValidator : IFormatValidator
    {
        private static readonly string[] _timeFormats =
            {
                "HH':'mm':'ss'.'fffffffK",
                "HH':'mm':'ss'.'ffffffK",
                "HH':'mm':'ss'.'fffffK",
                "HH':'mm':'ss'.'ffffK",
                "HH':'mm':'ss'.'fffK",
                "HH':'mm':'ss'.'ffK",
                "HH':'mm':'ss'.'fK",
                "HH':'mm':'ssK",
                "HH':'mm':'ss"
            };

        /// <summary>
        /// A singleton instance of the validator.
        /// </summary>
        public static IFormatValidator Instance { get; } = new TimeFormatValidator();

        /// <summary>
        /// Gets the format this validator handles.
        /// </summary>
        public string Format => "time";

        /// <summary>
        /// Gets the JSON Schema draft versions supported by this format.
        /// </summary>
        public JsonSchemaVersion SupportedBy => JsonSchemaVersion.All;

        /// <summary>
        /// Validates a value.
        /// </summary>
        /// <param name="value">The value to validate.</param>
        /// <returns>True if <paramref name="value"/> matches the format; otherwise false.</returns>
        public bool Validate(JsonValue value)
        {
            return value.Type != JsonValueType.String ||
                   DateTimeOffset.TryParseExact(value.String, _timeFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
        }
    }
}
