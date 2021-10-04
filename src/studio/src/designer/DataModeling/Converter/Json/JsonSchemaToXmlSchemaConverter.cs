using System;
using System.Linq;
using System.Text.Json;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json
{
    /// <summary>
    /// Class for converting Json schema to Xml Schema
    /// </summary>
    public class JsonSchemaToXmlSchemaConverter
    {
        private readonly IJsonSchemaNormalizer _normalizer;

        private JsonSchema _jsonSchema;
        private Uri _schemaUri;
        private IJsonSchemaConverterStrategy _strategy;
        private XmlSchema _xmlSchema;

        /// <summary>
        /// Creates an instance of this class providing a normalizer that normalizes and simplifies
        /// the json structure before converting it to a xml schema.
        /// </summary>
        public JsonSchemaToXmlSchemaConverter(IJsonSchemaNormalizer normalizer)
        {
            _normalizer = normalizer;
        }

        /// <summary>
        /// Converts a <see cref="JsonSchema"/> to a matching <see cref="XmlSchema"/>
        /// </summary>
        /// <param name="schema">The schema to convert</param>
        public XmlSchema Convert(JsonSchema schema)
        {
            var uri = new Uri("schema.json", UriKind.Relative);
            return Convert(schema, uri);
        }

        /// <summary>
        /// Converts a <see cref="JsonSchema"/> to a matching <see cref="XmlSchema"/>
        /// </summary>
        /// <param name="schema">The schema to convert</param>
        /// <param name = "schemaUri" > Uri that represents the unique id of the Json Schema.</param>
        /// <returns>XmlSchema genrated based on the Json Schema.</returns>
        public XmlSchema Convert(JsonSchema schema, Uri schemaUri)
        {
            _jsonSchema = _normalizer.Normalize(schema);
            _schemaUri = schemaUri;
            _strategy = JsonSchemaConverterStrategyFactory.SelectStrategy(_jsonSchema);
            ConvertUsingStrategy();
            return _xmlSchema;
        }
        
        /// <summary>
        /// Use the selected strategy to convert the Json Schema to Xml Schema
        /// </summary>
        private void ConvertUsingStrategy()
        {
            var analyzer = _strategy.GetAnalyzer();
            var converter = _strategy.GetConverter();

            JsonSchemaXsdMetadata result = analyzer.AnalyzeSchema(_jsonSchema, _schemaUri);
            _xmlSchema = converter.Convert(_jsonSchema, result);
        }
    }
}
