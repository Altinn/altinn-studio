using System;
using System.Collections.Generic;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public class JsonSchemaGeneralConverter : IJsonSchemaConverter
    {
        private readonly XmlDocument _xmlFactoryDocument = new XmlDocument();

        private JsonSchema _schema;

        /// <inheritdoc />
        public XmlSchema Convert(JsonSchema schema, JsonSchemaXsdMetadata metadata)
        {
            _schema = schema;

            var xsd = new XmlSchema();
            HandleSchemaAttributes(xsd, schema, metadata);
            HandleNamespaces(xsd, schema, metadata);
            HandleRootMessage(xsd, schema, metadata);

            IReadOnlyDictionary<string, JsonSchema> definitions = null;
            JsonPointer defsPath = JsonPointer.Empty;
            if (schema.TryGetKeyword(out DefsKeyword defs))
            {
                defsPath = JsonPointer.Parse($"#/{defs.Keyword()}");
                definitions = defs.Definitions;
            }
            else if (schema.TryGetKeyword(out DefinitionsKeyword defsLegacy))
            {
                defsPath = JsonPointer.Parse($"#/{defsLegacy.Keyword()}");
                definitions = defsLegacy.Definitions;
            }

            if (definitions != null)
            {
                HandleDefinitions(xsd, schema, definitions, defsPath, metadata);
            }

            return xsd;
        }

        private void HandleSchemaAttributes(XmlSchema xsd, JsonSchema schema, JsonSchemaXsdMetadata metadata)
        {
            if (schema.TryGetKeyword(out XsdSchemaAttributesKeyword attributes))
            {
                foreach (var (name, value) in attributes.Properties)
                {
                    // TODO: Use try parse and case insensitive comparison
                    switch (name)
                    {
                        case "AttributeFormDefault":
                            xsd.AttributeFormDefault = Enum.Parse<XmlSchemaForm>(value, true);
                            break;
                        case "ElementFormDefault":
                            xsd.ElementFormDefault = Enum.Parse<XmlSchemaForm>(value, true);
                            break;
                        case "BlockDefault":
                            xsd.BlockDefault = Enum.Parse<XmlSchemaDerivationMethod>(value, true);
                            break;
                        case "FinalDefault":
                            xsd.FinalDefault = Enum.Parse<XmlSchemaDerivationMethod>(value, true);
                            break;
                    }
                }
            }
        }

        private void HandleNamespaces(XmlSchema xsd, JsonSchema schema, JsonSchemaXsdMetadata metadata)
        {
            Dictionary<string, string> namespaces = new Dictionary<string, string>();

            if (schema.TryGetKeyword(out XsdNamespacesKeyword keyword))
            {
                foreach (var (prefix, ns) in keyword.Namespaces)
                {
                    namespaces.Add(prefix, ns);
                }
            }

            if (!namespaces.ContainsValue(KnownXmlNamespaces.XmlSchemaNamespace))
            {
                namespaces.Add("xsd", KnownXmlNamespaces.XmlSchemaNamespace);
            }

            if (!namespaces.ContainsValue(KnownXmlNamespaces.XmlSchemaInstanceNamespace))
            {
                namespaces.Add("xsi", KnownXmlNamespaces.XmlSchemaInstanceNamespace);
            }
        }

        private void HandleRootMessage(XmlSchema xsd, JsonSchema schema, JsonSchemaXsdMetadata metadata)
        {
            // TODO!!!!
        }

        private void HandleDefinitions(XmlSchema xsd, JsonSchema schema, IReadOnlyDictionary<string, JsonSchema> definitions, JsonPointer defsPath, JsonSchemaXsdMetadata metadata)
        {
            throw new System.NotImplementedException();
        }
    }
}
