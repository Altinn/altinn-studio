using System.Xml.Schema;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public interface IJsonSchemaToXmlSchemaConverterStrategy
    {
        /// <summary>
        /// Analyze the schema and return relevant metadata for the conversion process
        /// </summary>
        /// <param name="schema">The schema to analyze</param>
        /// <returns>The relevant metadata for the schema to convert properly</returns>
        JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema);

        /// <summary>
        /// Converts the schema using the provided metadata
        /// </summary>
        /// <param name="schema">The schema to convert</param>
        /// <param name="metadata">The metadata to use while converting</param>
        /// <returns>A new XmlSchema converted from the JSON Schema</returns>
        XmlSchema Convert(JsonSchema schema, JsonSchemaXsdMetadata metadata);
    }
}
