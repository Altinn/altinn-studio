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
        public SeresJsonSchemaAnalyzer()
            : base() { }

        /// <inheritdoc />
        public override JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema)
        {
            JsonSchema = schema;
            Metadata = new JsonSchemaXsdMetadata() { SchemaOrigin = "Seres" };

            if (JsonSchema.TryGetKeyword<XsdRootElementKeyword>(out var rootElementKd))
            {
                Metadata.MessageName = (string)rootElementKd.Value;
            }
            else if (JsonSchema.TryGetKeyword<InfoKeyword>(out var infoKd))
            {
                var infoValue = (JsonElement)infoKd.Value;
                var messageNameElement = infoValue.GetProperty("meldingsnavn");
                var messageTypeNameElement = infoValue.GetProperty("modellnavn");

                Metadata.MessageName =
                    messageNameElement.ValueKind == JsonValueKind.Undefined
                        ? "melding"
                        : messageNameElement.GetString();
                Metadata.MessageTypeName =
                    messageTypeNameElement.ValueKind == JsonValueKind.Undefined ? null : messageNameElement.GetString();
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
