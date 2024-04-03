using System.Text.Json.Nodes;

namespace Altinn.Studio.DataModeling.Validator.Json
{
    /// <summary>
    /// Validator for json schema.
    /// </summary>
    public interface IJsonSchemaValidator
    {
        /// <summary>
        /// Validates a json schema.
        /// </summary>
        /// <param name="jsonSchema">JsonSchema to validate</param>
        /// <returns>Validation result of validation.</returns>
        JsonSchemaValidationResult Validate(JsonNode jsonSchema);
    }
}
