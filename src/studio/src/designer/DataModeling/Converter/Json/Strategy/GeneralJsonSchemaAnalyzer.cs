using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <inheritdoc/>
    public class GeneralJsonSchemaAnalyzer : JsonSchemaAnalyzer, IJsonSchemaAnalyzer
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="GeneralJsonSchemaAnalyzer"/> class.
        /// </summary>
        public GeneralJsonSchemaAnalyzer() : base()
        {
        }

        /// <inheritdoc/>
        public override JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema)
        {
            JsonSchema = schema;
            Metadata = new JsonSchemaXsdMetadata();

            Metadata.MessageName = string.Empty;
            Metadata.MessageTypeName = string.Empty;
            
            DetermineRootModel(JsonSchema);
            AnalyzeSchema(JsonPointer.Parse("#"), JsonSchema);

            return Metadata;
        }
    }
}
