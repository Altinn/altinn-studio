using System.Xml.Schema;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public class JsonSchemaToXmlSchemaConverterGeneralStrategy : IJsonSchemaToXmlSchemaConverterStrategy
    {
        /// <inheritdoc />
        public JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema)
        {
            throw new System.NotImplementedException();
        }

        /// <inheritdoc />
        public XmlSchema Convert(JsonSchema schema, JsonSchemaXsdMetadata metadata)
        {
            throw new System.NotImplementedException();
        }
    }
}
