using System;
using System.Collections.Generic;
using System.Linq;
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
        private JsonSchemaXsdMetadata _metadata;
        private XmlSchema _xsd;

        /// <inheritdoc />
        public XmlSchema Convert(JsonSchema schema, JsonSchemaXsdMetadata metadata)
        {
            _schema = schema;
            _metadata = metadata;

            _xsd = new XmlSchema();

            HandleSchemaAttributes();
            HandleNamespaces();

            var keywords = _schema.AsWorkList();

            keywords.MarkAsHandled<SchemaKeyword>();
            keywords.MarkAsHandled<IdKeyword>();
            keywords.MarkAsHandled<TypeKeyword>();
            keywords.MarkAsHandled<XsdNamespacesKeyword>();
            keywords.MarkAsHandled<XsdSchemaAttributesKeyword>();

            foreach (var keyword in keywords.EnumerateUnhandledItems(false))
            {
                switch (keyword)
                {
                    case SchemaKeyword:
                        break;

                    case IdKeyword:
                        break;

                    case TypeKeyword:
                        break;

                    case XsdNamespacesKeyword:
                        break;

                    case XsdSchemaAttributesKeyword:
                        break;

                    case InfoKeyword x:
                        keywords.MarkAsHandled<InfoKeyword>();
                        HandleInfoKeyword(x);
                        break;

                    case DefsKeyword x:
                        keywords.MarkAsHandled<DefsKeyword>();
                        HandleDefinitions(JsonPointer.Parse($"#/{x.Keyword()}"), x.Definitions);
                        break;

                    case DefinitionsKeyword x:
                        keywords.MarkAsHandled<DefinitionsKeyword>();
                        HandleDefinitions(JsonPointer.Parse($"#/{x.Keyword()}"), x.Definitions);
                        break;

                    case OneOfKeyword:
                        if (!_metadata.HasInlineRoot)
                        {
                            keywords.MarkAsHandled<OneOfKeyword>();
                        }

                        HandleRootMessage(keywords);
                        break;

                    case AnyOfKeyword:
                        if (!_metadata.HasInlineRoot)
                        {
                            keywords.MarkAsHandled<AnyOfKeyword>();
                        }

                        HandleRootMessage(keywords);
                        break;

                    case AllOfKeyword:
                        if (!_metadata.HasInlineRoot)
                        {
                            keywords.MarkAsHandled<AllOfKeyword>();
                        }

                        HandleRootMessage(keywords);
                        break;

                    case PropertiesKeyword:
                        if (!_metadata.HasInlineRoot)
                        {
                            keywords.MarkAsHandled<PropertiesKeyword>();
                        }

                        HandleRootMessage(keywords);
                        break;
                }
            }

            var unhandledKeywords = keywords.EnumerateUnhandledItems().ToList();
            if (unhandledKeywords.Count > 0)
            {
                throw new Exception($"Unhandled keyword(s) in root JSON Schema '{string.Join("', '", unhandledKeywords.Select(kw => kw.Keyword()))}'");
            }

            return _xsd;
        }

        private void HandleInfoKeyword(InfoKeyword infoKeyword)
        {
            var markup = new List<XmlNode>();
            var xsdNamespace = _xsd.Namespaces.ToArray().First(ns => ns.Namespace == KnownXmlNamespaces.XmlSchemaNamespace);

            foreach (var property in infoKeyword.Value.EnumerateObject())
            {
                var element = _xmlFactoryDocument.CreateElement(xsdNamespace.Name, "attribute", xsdNamespace.Namespace);
                element.SetAttribute("name", property.Name);
                element.SetAttribute("fixed", property.Value.GetString());
                markup.Add(element);
            }

            var annotation = new XmlSchemaAnnotation
            {
                Parent = _xsd
            };
            _xsd.Items.Add(annotation);
            var documentation = new XmlSchemaDocumentation
            {
                Parent = annotation,
                Markup = markup.ToArray()
            };
            annotation.Items.Add(documentation);
        }

        private void HandleSchemaAttributes()
        {
            if (_schema.TryGetKeyword(out XsdSchemaAttributesKeyword attributes))
            {
                foreach (var (name, value) in attributes.Properties)
                {
                    // TODO: Use try parse and case insensitive comparison
                    switch (name)
                    {
                        case "AttributeFormDefault":
                            _xsd.AttributeFormDefault = Enum.Parse<XmlSchemaForm>(value, true);
                            break;
                        case "ElementFormDefault":
                            _xsd.ElementFormDefault = Enum.Parse<XmlSchemaForm>(value, true);
                            break;
                        case "BlockDefault":
                            _xsd.BlockDefault = Enum.Parse<XmlSchemaDerivationMethod>(value, true);
                            break;
                        case "FinalDefault":
                            _xsd.FinalDefault = Enum.Parse<XmlSchemaDerivationMethod>(value, true);
                            break;
                    }
                }
            }
        }

        private XmlSchemaObject ConvertSubschema(JsonPointer path, JsonSchema schema)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);

            if (compatibleTypes.Contains(CompatibleXsdType.SimpleType))
            {
                if (compatibleTypes.Contains(CompatibleXsdType.Attribute))
                {
                    var item = new XmlSchemaAttribute();
                    HandleAttribute(item, schema.AsWorkList(), path);
                    return item;
                }
                else
                {
                    var item = new XmlSchemaElement();
                    HandleSimpleType(item, schema.AsWorkList(), path);
                    return item;
                }
            }

            throw new NotImplementedException();
        }

        private void HandleNamespaces()
        {
            Dictionary<string, string> namespaces = new Dictionary<string, string>();

            if (_schema.TryGetKeyword(out XsdNamespacesKeyword keyword))
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

            foreach (var (prefix, ns) in namespaces)
            {
                _xsd.Namespaces.Add(prefix, ns);
            }
        }

        private void HandleRootMessage(WorkList<IJsonSchemaKeyword> keywords)
        {
            var root = new XmlSchemaElement
            {
                Parent = _xsd,
                Name = _metadata.MessageName
            };
            _xsd.Items.Add(root);

            if (_metadata.HasInlineRoot)
            {
                var rootPath = JsonPointer.Parse("#");
                var rootTypes = _metadata.GetCompatibleTypes(rootPath);

                if (rootTypes.Contains(CompatibleXsdType.ComplexType))
                {
                    HandleComplexType(root, keywords, rootPath);
                }
                else if (rootTypes.Contains(CompatibleXsdType.SimpleType))
                {
                    HandleSimpleType(root, keywords, rootPath);
                }
                else
                {
                    throw new Exception("Schema has inlined root element, but it is not defined as being a valid SimpleType or ComplexType");
                }
            }
            else
            {
                var reference =
                    (_schema.GetKeyword<AllOfKeyword>()?.Schemas[0] ??
                     _schema.GetKeyword<AnyOfKeyword>()?.Schemas[0] ??
                     _schema.GetKeyword<OneOfKeyword>()?.Schemas[0]).GetKeyword<RefKeyword>();

                root.SchemaTypeName = GetTypeNameFromReference(reference.Reference);
            }
        }

        private static XmlQualifiedName GetTypeNameFromReference(Uri reference)
        {
            var pointer = JsonPointer.Parse(reference.ToString());
            if (pointer.Segments.Length != 2 || (pointer.Segments[0].Value != "$defs" && pointer.Segments[0].Value != "definitions"))
            {
                throw new Exception("Reference uri must point to a definition in $defs/definitions to be used as TypeName");
            }

            return new XmlQualifiedName(pointer.Segments[1].Value);
        }

        private void HandleDefinitions(JsonPointer defsPath, IReadOnlyDictionary<string, JsonSchema> definitions)
        {
            foreach (var (name, definition) in definitions)
            {
                var subSchemaPath = defsPath.Combine(JsonPointer.Parse($"/{name}"));
                HandleDefinition(name, subSchemaPath, definition);
            }
        }

        private void HandleDefinition(string name, JsonPointer path, JsonSchema definition)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);
            if (compatibleTypes.Contains(CompatibleXsdType.ComplexType))
            {
                var complexType = new XmlSchemaComplexType();
                HandleComplexType(complexType, definition.AsWorkList(), path);
                SetName(complexType, name);
                complexType.Parent = _xsd;
                _xsd.Items.Add(complexType);
            }
        }

        private void HandleAttribute(XmlSchemaAttribute attribute, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);

            if (compatibleTypes.Contains(CompatibleXsdType.SimpleTypeList))
            {
                throw new NotImplementedException();
            }

            if (compatibleTypes.Contains(CompatibleXsdType.SimpleTypeRestriction))
            {
                throw new NotImplementedException();
            }

            if (keywords.TryPull(out RefKeyword refKeyword))
            {
                attribute.SchemaTypeName = GetTypeNameFromReference(refKeyword.Reference);
            }

            if (keywords.TryPull(out TypeKeyword typeKeyword))
            {
                attribute.SchemaTypeName = GetTypeNameFromTypeKeyword(typeKeyword, keywords);
            }
        }

        private void HandleSimpleType(XmlSchemaElement element, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);

            if (compatibleTypes.Contains(CompatibleXsdType.SimpleTypeList))
            {
                throw new NotImplementedException();
            }

            if (compatibleTypes.Contains(CompatibleXsdType.SimpleTypeRestriction))
            {
                throw new NotImplementedException();
            }

            if (keywords.TryPull(out RefKeyword refKeyword))
            {
                element.SchemaTypeName = GetTypeNameFromReference(refKeyword.Reference);
            }

            if (keywords.TryPull(out TypeKeyword typeKeyword))
            {
                element.SchemaTypeName = GetTypeNameFromTypeKeyword(typeKeyword, keywords);
            }
        }

        private XmlQualifiedName GetTypeNameFromTypeKeyword(TypeKeyword typeKeyword, WorkList<IJsonSchemaKeyword> keywords)
        {
            switch (typeKeyword.Type)
            {
                case SchemaValueType.Null:
                    return null;
                case SchemaValueType.Boolean:
                case SchemaValueType.String:
                case SchemaValueType.Number:
                case SchemaValueType.Integer:
                    XmlQualifiedName typeName = SetType(typeKeyword.Type, keywords.Pull<FormatKeyword>()?.Value, keywords.Pull<XsdTypeKeyword>()?.Value);
                    return typeName;
                default:
                    throw new ArgumentOutOfRangeException();
            }
        }

        private void HandleComplexType(XmlSchemaElement element, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var item = new XmlSchemaComplexType
            {
                Parent = element
            };
            element.SchemaType = item;
            HandleComplexType(item, keywords, path);
        }

        private void HandleComplexType(XmlSchemaComplexType item, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);

            if (compatibleTypes.Contains(CompatibleXsdType.ComplexContentRestriction))
            {
                throw new NotImplementedException();
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.ComplexContentExtension))
            {
                HandleComplexContentExtension(item, keywords, path);
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.SimpleContentRestriction))
            {
                throw new NotImplementedException();
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.SimpleContentExtension))
            {
                throw new NotImplementedException();
            }
            else
            {
                // Plain complex type
                var sequence = new XmlSchemaSequence
                {
                    Parent = item
                };

                if (keywords.TryPull<AllOfKeyword>(out var allOfKeyword))
                {
                    var i = 0;
                    foreach (var subSchema in allOfKeyword.GetSubschemas())
                    {
                        if (subSchema.HasKeyword<RefKeyword>())
                        {
                            i++;
                            continue;
                        }

                        if (subSchema.HasKeyword<PropertiesKeyword>())
                        {
                            HandlePropertiesKeyword(item, sequence, subSchema.AsWorkList(), path.Combine(JsonPointer.Parse($"/allOf/[{i}]")));
                        }

                        i++;
                    }
                }
                else
                {
                    HandlePropertiesKeyword(item, sequence, keywords, path);
                }

                if (sequence.Items.Count > 0)
                {
                    item.Particle = sequence;
                }
            }
        }

        private void HandleComplexContentExtension(XmlSchemaComplexType item, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            // <xsd:complexContent>
            var complexContent = new XmlSchemaComplexContent()
            {
                Parent = item
            };

            var allOfKeyword = keywords.Pull<AllOfKeyword>();
            var subSchemas = allOfKeyword.GetSubschemas();
            var refKeywordSchema = subSchemas.First(k => k.Keywords.HasKeyword<RefKeyword>());

            // <xsd:extension base="...">
            var extension = new XmlSchemaComplexContentExtension()
            {
                Parent = complexContent,
                BaseTypeName = GetTypeNameFromReference(refKeywordSchema.Keywords.GetKeyword<RefKeyword>().Reference)
            };

            complexContent.Content = extension;

            // This is a bit a naive and supports only sequence as of now. When implementing choice
            // in issue https://github.com/Altinn/altinn-studio/issues/4803 this needs to be changed.
            // <xsd:sequence>
            var sequence = new XmlSchemaSequence
            {
                Parent = extension
            };

            // Loop sub-schemas except the one with RefKeyword since this
            // is alread handled.
            var i = 0;
            foreach (var subSchema in subSchemas)
            {
                if (subSchema.HasKeyword<RefKeyword>())
                {
                    i++;
                    continue;
                }

                if (subSchema.HasKeyword<PropertiesKeyword>())
                {
                    HandlePropertiesKeyword(item, sequence, subSchema.AsWorkList(), path.Combine(JsonPointer.Parse($"/allOf/[{i}]")));
                }

                i++;
            }

            if (sequence.Items.Count > 0)
            {
                extension.Particle = sequence;
            }

            item.ContentModel = complexContent;
        }

        private void HandlePropertiesKeyword(XmlSchemaComplexType complexType, XmlSchemaSequence sequence, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var required = keywords.Pull<RequiredKeyword>()?.Properties ?? new List<string>();
            if (keywords.TryPull(out PropertiesKeyword propertiesKeyword))
            {
                foreach (var (name, property) in propertiesKeyword.Properties)
                {
                    var subItem = ConvertSubschema(path.Combine(JsonPointer.Parse($"/properties/{name}")), property);

                    SetName(subItem, name);
                    SetRequired(subItem, required.Contains(name));
                    SetFixed(subItem, property.Keywords.GetKeyword<ConstKeyword>());
                    SetDefault(subItem, property.Keywords.GetKeyword<DefaultKeyword>());

                    switch (subItem)
                    {
                        case XmlSchemaAttribute attribute:
                            attribute.Parent = complexType;
                            complexType.Attributes.Add(attribute);
                            break;
                        case XmlSchemaElement element:
                            element.Parent = sequence;
                            sequence.Items.Add(element);
                            break;
                        default:
                            throw new NotImplementedException();
                    }
                }
            }
        }

        private void SetName(XmlSchemaObject item, string name)
        {
            switch (item)
            {
                case XmlSchemaElement x:
                    x.Name = name;
                    break;
                case XmlSchemaAttribute x:
                    x.Name = name;
                    break;
                case XmlSchemaSimpleType x:
                    x.Name = name;
                    break;
                case XmlSchemaComplexType x:
                    x.Name = name;
                    break;
                case XmlSchemaAttributeGroup x:
                    x.Name = name;
                    break;
                case XmlSchemaGroup x:
                    x.Name = name;
                    break;
            }
        }

        private void SetRequired(XmlSchemaObject item, bool isRequired)
        {
            var isOptional = !isRequired;
            switch (item)
            {
                case XmlSchemaParticle particle:
                    if (isOptional)
                    {
                        particle.MinOccurs = 0;
                    }

                    break;
                case XmlSchemaAttribute attribute:
                    if (isRequired)
                    {
                        attribute.Use = XmlSchemaUse.Required;
                    }

                    break;
            }
        }

        private void SetFixed(XmlSchemaObject item, ConstKeyword constKeyword)
        {
            if (constKeyword is null)
            {
                return;
            }

            switch (item)
            {
                case XmlSchemaParticle particle:
                    break;
                case XmlSchemaAttribute attribute:
                    attribute.FixedValue = constKeyword.Value.ToString();
                    break;
            }
        }

        private void SetDefault(XmlSchemaObject item, DefaultKeyword defaultKeyword)
        {
            if (defaultKeyword is null)
            {
                return;
            }

            switch (item)
            {
                case XmlSchemaParticle particle:
                    break;
                case XmlSchemaAttribute attribute:
                    attribute.DefaultValue = defaultKeyword.Value.ToString();
                    break;
            }
        }

        private static XmlQualifiedName SetType(SchemaValueType type, Format format, string xsdType)
        {
            if (string.IsNullOrWhiteSpace(xsdType))
            {
                switch (type)
                {
                    case SchemaValueType.Boolean:
                        xsdType = "boolean";
                        break;
                    case SchemaValueType.String:
                        xsdType = GetStringTypeFromFormat(format);
                        break;
                    case SchemaValueType.Number:
                        xsdType = "double";
                        break;
                    case SchemaValueType.Integer:
                        xsdType = "long";
                        break;
                    default:
                        xsdType = "string"; // Fallback to open string value
                        break;
                }
            }

            return new XmlQualifiedName(xsdType, KnownXmlNamespaces.XmlSchemaNamespace);
        }

        private static string GetStringTypeFromFormat(Format format)
        {
            switch (format.Key)
            {
                case "date-time":
                    return "dateTime";
                case "date":
                    return "date";
                case "time":
                    return "time";
                case "uri":
                    return "anyURI";
            }

            return "string"; // Fallback to open string value
        }
    }
}
