using Json.Schema;

namespace Altinn.Studio.DataModeling.Json
{
    /// <summary>
    /// Normalizes a JSON schema for easier analysis
    /// </summary>
    public interface IJsonSchemaNormalizer
    {
        /// <summary>
        /// Normalizes a JSON schema for easier analysis
        /// </summary>
        /// <param name="jsonSchema">The schema to normalize</param>
        /// <returns>A normalized <see cref="JsonSchema"/></returns>
        JsonSchema Normalize(JsonSchema jsonSchema);
    }
}
