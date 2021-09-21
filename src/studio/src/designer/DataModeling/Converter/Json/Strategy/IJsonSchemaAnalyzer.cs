using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public interface IJsonSchemaAnalyzer
    {
        /// <summary>
        /// Analyze the schema and return relevant metadata for the conversion process
        /// </summary>
        /// <param name="schema">The schema to analyze</param>
        /// <returns>The relevant metadata for the schema to convert properly</returns>
        JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema);
    }
}