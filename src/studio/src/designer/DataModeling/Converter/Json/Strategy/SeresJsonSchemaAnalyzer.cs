using System;
using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public class SeresJsonSchemaAnalyzer : JsonSchemaAnalyzer, IJsonSchemaAnalyzer
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="SeresJsonSchemaAnalyzer"/> class.
        /// </summary>
        public SeresJsonSchemaAnalyzer() : base()
        {
        }

        /// <inheritdoc />
        public override JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema, Uri uri)
        {
            JsonSchema = schema;
            Metadata = new JsonSchemaXsdMetadata()
            {
                SchemaOrigin = "Seres"
            };

            if (JsonSchema.TryGetKeyword(out InfoKeyword info))
            {
                var messageNameElement = info.Value.GetProperty("meldingsnavn");
                var messageTypeNameElement = info.Value.GetProperty("modellnavn");

                Metadata.MessageName = messageNameElement.ValueKind == JsonValueKind.Undefined ? "melding" : messageNameElement.GetString();
                Metadata.MessageTypeName = messageTypeNameElement.ValueKind == JsonValueKind.Undefined ? null : messageNameElement.GetString();
            }
            else
            {
                Metadata.MessageName = "melding";
            }

            DetermineRootModel(JsonSchema);
            AnalyzeSchema(JsonPointer.Parse("#"), JsonSchema);

            return Metadata;
        }
    }
}
