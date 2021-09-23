using System;
using Altinn.Studio.DataModeling.Utils;
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
        public override JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema, Uri uri)
        {
            JsonSchema = schema;
            Metadata = new JsonSchemaXsdMetadata
            {
                SchemaOrigin = "Standard",
                MessageName = UrlHelper.GetName(uri.ToString()),
                MessageTypeName = string.Empty
            };

            DetermineRootModel(JsonSchema);
            AnalyzeSchema(JsonPointer.Parse("#"), JsonSchema);

            return Metadata;
        }
    }
}
