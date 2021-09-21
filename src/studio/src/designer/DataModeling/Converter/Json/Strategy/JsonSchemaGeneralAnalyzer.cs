using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <inheritdoc/>
    public class JsonSchemaGeneralAnalyzer : JsonSchemaAnalyzer, IJsonSchemaAnalyzer
    {
        /// <inheritdoc/>
        public override JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema)
        {
            return Metadata;
        }
    }
}
