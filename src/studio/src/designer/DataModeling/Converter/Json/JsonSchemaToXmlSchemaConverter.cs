using System;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Interfaces;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json
{
    /// <summary>
    /// Class for converting Json schema to Xml Schema
    /// </summary>
    public class JsonSchemaToXmlSchemaConverter : IJsonSchemaToXmlSchemaConverter
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

        /// <inheritdoc/>
        public XmlSchema Convert(JsonSchema schema)
        {
            var uri = new Uri("schema.json", UriKind.Relative);
            return Convert(schema, uri);
        }

        /// <inheritdoc/>
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
