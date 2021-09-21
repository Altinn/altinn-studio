using System;
using System.Linq;
using System.Text.Json;
using System.Xml;
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
            _strategy = SelectStrategy();
            ConvertUsingStrategy();
            return _xmlSchema;
        }

        /// <summary>
        /// Select converting strategy based on simple analysis of schema information, will chose one of SERES, OR og General strategies
        /// </summary>
        /// <returns></returns>
        private IJsonSchemaConverterStrategy SelectStrategy()
        {
            if (_jsonSchema.TryGetKeyword(out XsdNamespacesKeyword namespaces))
            {
                foreach ((_, string ns) in namespaces.Namespaces)
                {
                    if (ns.Equals(KnownXmlNamespaces.SERES, StringComparison.InvariantCultureIgnoreCase))
                    {
                        return new SeresJsonSchemaConverterStrategy();
                    }

                    if (ns.Equals(KnownXmlNamespaces.OR, StringComparison.InvariantCultureIgnoreCase))
                    {
                        return new OrJsonSchemaConverterStrategy();
                    }
                }
            }

            if (_jsonSchema.TryGetKeyword(out InfoKeyword info))
            {
                JsonElement value = info.Value;
                if (value.ValueKind == JsonValueKind.Object)
                {
                    JsonElement generatorScriptName = value.EnumerateObject().FirstOrDefault(obj => obj.NameEquals("XSLT-skriptnavn")).Value;
                    if (generatorScriptName.ValueKind == JsonValueKind.String &&
                        generatorScriptName.ValueEquals("SERES_XSD_GEN"))
                    {
                        return new SeresJsonSchemaConverterStrategy();
                    }
                }
            }

            return new GeneralJsonSchemaConverterStrategy();
        }

        /// <summary>
        /// Use the selected strategy to convert the Json Schema to Xml Schema
        /// </summary>
        private void ConvertUsingStrategy()
        {
            var analyzer = _strategy.GetAnalyzer();
            var converter = _strategy.GetConverter();

            JsonSchemaXsdMetadata result = analyzer.AnalyzeSchema(_jsonSchema);
            _xmlSchema = converter.Convert(_jsonSchema, result);
        }
    }
}
