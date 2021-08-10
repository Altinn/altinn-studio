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
        private IJsonSchemaToXmlSchemaConverterStrategy _strategy;
        private XmlSchema _xmlSchema;

        /// <summary>
        /// Placeholder
        /// </summary>
        public JsonSchemaToXmlSchemaConverter(IJsonSchemaNormalizer normalizer)
        {
            _normalizer = normalizer;
        }

        /// <summary>
        /// Placeholder
        /// </summary>
        /// <param name="schema">The schema to convert</param>
        /// <returns></returns>
        public XmlSchema Convert(JsonSchema schema)
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
        private IJsonSchemaToXmlSchemaConverterStrategy SelectStrategy()
        {
            if (_jsonSchema.TryGetKeyword(out XsdNamespacesKeyword namespaces))
            {
                foreach ((_, string ns) in namespaces.Namespaces)
                {
                    if (ns.Equals(KnownXmlNamespaces.SERES, StringComparison.InvariantCultureIgnoreCase))
                    {
                        return new JsonSchemaToXmlSchemaConverterSeresStrategy();
                    }

                    if (ns.Equals(KnownXmlNamespaces.OR, StringComparison.InvariantCultureIgnoreCase))
                    {
                        return new JsonSchemaToXmlSchemaConverterOrStrategy();
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
                        return new JsonSchemaToXmlSchemaConverterSeresStrategy();
                    }
                }
            }

            return new JsonSchemaToXmlSchemaConverterGeneralStrategy();
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
