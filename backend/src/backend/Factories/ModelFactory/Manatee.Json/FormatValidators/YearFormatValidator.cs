using Manatee.Json.Schema;

namespace Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json.FormatValidators
{
    /// <summary>
    /// Handles `year` format validation by using a regular expression.
    /// </summary>
    public class YearFormatValidator : RegexBasedFormatValidator
    {/// <summary>
     /// A singleton instance of the validator.
     /// </summary>
        public static IFormatValidator Instance { get; } = new YearFormatValidator();

        /// <summary>
        /// Gets the format this validator handles.
        /// </summary>
        public override string Format => "year";

        /// <summary>
        /// Gets the JSON Schema draft versions supported by this format.
        /// </summary>
        public override JsonSchemaVersion SupportedBy => JsonSchemaVersion.All;

        private YearFormatValidator()
            : base(@"^\d{4}$")
        {
        }
    }
}
