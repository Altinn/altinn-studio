using System;
using System.Collections.Generic;
using System.Globalization;
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
    /// Class for converting a Json Schema to XSD.
    /// The convert process depends on a metadata class being provided <see cref="JsonSchemaXsdMetadata"/>
    /// in order to determine how the various Json Schema nodes should be converted. For each node in the Json Schema
    /// there is a set of XSD compatibilities <see cref="CompatibleXsdType"/> available that can be used
    /// when deciding how a particular node should be represented in the XSD.
    /// </summary>
    public class GeneralJsonSchemaConverter : IJsonSchemaConverter
    {
        private readonly XmlDocument _xmlFactoryDocument = new XmlDocument();

        private JsonSchema _schema;
        private JsonSchemaXsdMetadata _metadata;
        private XmlSchema _xsd;
        private Dictionary<string, string> _namespaces;

        /// <inheritdoc />
        public XmlSchema Convert(JsonSchema schema, JsonSchemaXsdMetadata metadata)
        {
            _schema = schema;
            _metadata = metadata;
            _xsd = new XmlSchema();
            _namespaces = new Dictionary<string, string>();

            HandleSchemaAttributes();
            HandleNamespaces();
            HandleSchemaUnhandledAttributes();

            var keywords = _schema.AsWorkList();

            keywords.MarkAsHandled<SchemaKeyword>();
            keywords.MarkAsHandled<IdKeyword>();
            keywords.MarkAsHandled<TypeKeyword>();
            keywords.MarkAsHandled<XsdNamespacesKeyword>();
            keywords.MarkAsHandled<XsdSchemaAttributesKeyword>();
            keywords.MarkAsHandled<XsdUnhandledAttributesKeyword>();

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
                    case XsdRootElementKeyword:
                        keywords.MarkAsHandled<XsdRootElementKeyword>();
                        break;

                    case DescriptionKeyword:
                        keywords.MarkAsHandled<DescriptionKeyword>();
                        break;
                }
            }

            var unhandledKeywords = keywords.EnumerateUnhandledItems().ToList();
            if (unhandledKeywords.Count > 0)
            {
                throw new ArgumentException($"Unhandled keyword(s) in root JSON Schema '{string.Join("', '", unhandledKeywords.Select(kw => kw.Keyword()))}'");
            }

            var schemaSet = new XmlSchemaSet();
            schemaSet.Add(_xsd);
            schemaSet.Compile();

            return _xsd;
        }

        private void HandleSchemaAttributes()
        {
            if (_schema.TryGetKeyword(out XsdSchemaAttributesKeyword attributes))
            {
                foreach (var (name, value) in attributes.Properties)
                {
                    switch (name)
                    {
                        case "AttributeFormDefault":
                            _xsd.AttributeFormDefault = Enum.TryParse(value, true, out XmlSchemaForm xmlSchemaFormAttribute) ? xmlSchemaFormAttribute : XmlSchemaForm.Unqualified;
                            break;
                        case "ElementFormDefault":
                            _xsd.ElementFormDefault = Enum.TryParse(value, true, out XmlSchemaForm xmlSchemaFormElement) ? xmlSchemaFormElement : XmlSchemaForm.Qualified;
                            break;
                        case "BlockDefault":
                            _xsd.BlockDefault = Enum.TryParse(value, true, out XmlSchemaDerivationMethod xmlSchemaDerivationBlock) ? xmlSchemaDerivationBlock : XmlSchemaDerivationMethod.None;
                            break;
                        case "FinalDefault":
                            _xsd.FinalDefault = Enum.TryParse(value, true, out XmlSchemaDerivationMethod xmlSchemaDerivationFinal) ? xmlSchemaDerivationFinal : XmlSchemaDerivationMethod.None;
                            break;
                        case nameof(XmlSchema.TargetNamespace):
                            _xsd.TargetNamespace = value;
                            break;
                    }
                }
            }
        }

        private void HandleSchemaUnhandledAttributes()
        {
            AddUnhandledAttributes(_xsd, _schema.Keywords.GetKeyword<XsdUnhandledAttributesKeyword>());
        }

        private void HandleNamespaces()
        {
            _namespaces = new Dictionary<string, string>();

            if (_schema.TryGetKeyword(out XsdNamespacesKeyword keyword))
            {
                foreach (var (prefix, ns) in keyword.Namespaces)
                {
                    _namespaces.Add(prefix, ns);
                }
            }

            if (!_namespaces.ContainsValue(KnownXmlNamespaces.XmlSchemaNamespace))
            {
                _namespaces.Add("xsd", KnownXmlNamespaces.XmlSchemaNamespace);
            }

            if (!_namespaces.ContainsValue(KnownXmlNamespaces.XmlSchemaInstanceNamespace))
            {
                _namespaces.Add("xsi", KnownXmlNamespaces.XmlSchemaInstanceNamespace);
            }

            foreach (var (prefix, ns) in _namespaces)
            {
                _xsd.Namespaces.Add(prefix, ns);
            }
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
                var complexType = new XmlSchemaComplexType
                {
                    Parent = _xsd
                };

                HandleComplexType(complexType, definition.AsWorkList(), path);
                SetName(complexType, name);
                AddUnhandledAttributes(complexType, definition.Keywords.GetKeyword<XsdUnhandledAttributesKeyword>());
                _xsd.Items.Add(complexType);
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.SimpleType))
            {
                var simpleType = new XmlSchemaSimpleType
                {
                    Parent = _xsd
                };

                HandleSimpleType(simpleType, definition.AsWorkList(), path);
                SetName(simpleType, name);
                AddUnhandledAttributes(simpleType, definition.Keywords.GetKeyword<XsdUnhandledAttributesKeyword>());
                _xsd.Items.Add(simpleType);
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
                    throw new ArgumentException("Schema has inlined root element, but it is not defined as being a valid SimpleType or ComplexType");
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
                HandleSimpleContentRestriction(item, keywords, path);
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.SimpleContentExtension))
            {
                HandleSimpleContentExtension(item, keywords, path);
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

                        HandlePropertiesKeyword(item, sequence, subSchema.AsWorkList(), path.Combine(JsonPointer.Parse($"/allOf/[{i}]")));

                        i++;
                    }
                }
                else
                {
                    HandlePropertiesKeyword(item, sequence, keywords, path);
                }

                HandleAnyAttributeKeyword(item, keywords);

                if (sequence.Items.Count > 0)
                {
                    item.Particle = sequence;
                }
            }
        }

        private void HandleComplexType(XmlSchemaElement element, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);

            // Not ideal, but for now order matters when it comes to handling nillable
            // and arrays. HandleNillableComplexType will handle arrays within if the nillable
            // is also an array. But the handling of arrays won't handle nillables.
            if (compatibleTypes.Contains(CompatibleXsdType.Nillable))
            {
                HandleNillableComplexType(element, path, keywords);
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.Array))
            {
                var itemsKeyword = keywords.GetKeyword<ItemsKeyword>();
                if (itemsKeyword.SingleSchema.HasKeyword<PropertiesKeyword>())
                {
                    var item = new XmlSchemaComplexType
                    {
                        Parent = element
                    };
                    element.SchemaType = item;
                    HandleComplexType(item, itemsKeyword.SingleSchema.AsWorkList(), path);
                }
                else
                {
                    element.SchemaTypeName = GetTypeNameFromArray(itemsKeyword.SingleSchema, itemsKeyword.SingleSchema.AsWorkList());
                }
            }
            else if (keywords.TryPull(out RefKeyword reference))
            {
                element.SchemaTypeName = GetTypeNameFromReference(reference.Reference);
            }
            else
            {
                var item = new XmlSchemaComplexType
                {
                    Parent = element
                };
                element.SchemaType = item;
                HandleComplexType(item, keywords, path);
            }
        }

        private void HandleNillableComplexType(XmlSchemaElement element, JsonPointer path, WorkList<IJsonSchemaKeyword> keywords)
        {
            var oneOfKeyword = keywords.GetKeyword<OneOfKeyword>();

            var handled = oneOfKeyword is null
                ? TryHandleNonCompositionNillableComplexType(element, path, keywords)
                : TryHandleCompositionNillableComplexType(element, oneOfKeyword, path);

            if (!handled)
            {
                throw new JsonSchemaConvertException("The provided schema could not be handled as a nillable complex type.");
            }

            element.IsNillable = true;
        }

        private bool TryHandleNonCompositionNillableComplexType(XmlSchemaElement element, JsonPointer path, WorkList<IJsonSchemaKeyword> keywords)
        {
            if (keywords.HasKeyword<XsdNillableKeyword>(k => k.Value) && keywords.TryGetKeyword(out RefKeyword reference))
            {
                element.SchemaTypeName = GetTypeNameFromReference(reference.Reference);
                return true;
            }

            if (keywords.HasKeyword<XsdNillableKeyword>(k => k.Value) && keywords.HasKeyword<PropertiesKeyword>())
            {
                var item = new XmlSchemaComplexType
                {
                    Parent = element
                };
                element.SchemaType = item;

                HandleComplexType(item, keywords, path);
                return true;
            }

            var typeKeyword = keywords.GetKeyword<TypeKeyword>();
            var itemsKeyword = keywords.GetKeyword<ItemsKeyword>();

            if (typeKeyword == null && itemsKeyword == null)
            {
                return false;
            }

            if (_metadata.GetCompatibleTypes(path).Contains(CompatibleXsdType.ComplexContentExtension))
            {
                var item = new XmlSchemaComplexType
                {
                    Parent = element
                };
                element.SchemaType = item;

                HandleComplexType(item, itemsKeyword.SingleSchema.AsWorkList(), path);
            }
            else
            {
                var oneOf = itemsKeyword.SingleSchema.GetKeyword<OneOfKeyword>();
                if (oneOf is null && itemsKeyword.SingleSchema.TryGetKeyword(out RefKeyword itemsRef))
                {
                    element.SchemaTypeName = GetTypeNameFromReference(itemsRef.Reference);
                }
                else
                {
                    var refKeyword = itemsKeyword.SingleSchema.GetKeyword<OneOfKeyword>().GetSubschemas().FirstOrDefault(s => s.HasKeyword<RefKeyword>()).GetKeyword<RefKeyword>();
                    element.SchemaTypeName = GetTypeNameFromReference(refKeyword.Reference);
                }
            }

            return true;
        }

        private bool TryHandleCompositionNillableComplexType(XmlSchemaElement element, OneOfKeyword oneOfKeyword, JsonPointer path)
        {
            var refKeywordSubSchema = oneOfKeyword.GetSubschemas().FirstOrDefault(s => s.Keywords.HasKeyword<RefKeyword>());
            var propertiesKeywordSubSchema = oneOfKeyword.GetSubschemas().FirstOrDefault(s => s.Keywords.HasKeyword<PropertiesKeyword>());

            // Element with type reference to a ComplexType
            if (refKeywordSubSchema != null)
            {
                element.SchemaTypeName = GetTypeNameFromReference(refKeywordSubSchema.GetKeyword<RefKeyword>().Reference);
                return true;
            }

            // Element with inline ComplexType
            if (propertiesKeywordSubSchema != null)
            {
                var item = new XmlSchemaComplexType
                {
                    Parent = element
                };
                element.SchemaType = item;

                var propertiesKeywordSubSchemaIndex = GetKeywordSubSchemaIndex<PropertiesKeyword>(oneOfKeyword.Schemas);
                HandleComplexType(item, propertiesKeywordSubSchema.AsWorkList(), path.Combine(JsonPointer.Parse($"/oneOf/[{propertiesKeywordSubSchemaIndex}]")));
                return true;
            }

            return false;
        }

        private void HandleSimpleType(XmlSchemaElement element, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);
            if (compatibleTypes.Contains(CompatibleXsdType.Array))
            {
                var itemsKeyword = keywords.GetKeyword<ItemsKeyword>();
                element.SchemaTypeName = GetTypeNameFromArray(itemsKeyword.SingleSchema, itemsKeyword.SingleSchema.AsWorkList());
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.Nillable) && keywords.TryPull(out OneOfKeyword oneOfKeyword))
            {
                var refKeywordSubSchema = oneOfKeyword.GetSubschemas().FirstOrDefault(s => s.Keywords.HasKeyword<RefKeyword>());
                element.SchemaTypeName = GetTypeNameFromReference(refKeywordSubSchema.GetKeyword<RefKeyword>().Reference);
                element.IsNillable = true;
            }
            else if (keywords.TryPull(out RefKeyword reference))
            {
                element.SchemaTypeName = GetTypeNameFromReference(reference.Reference);
            }
            else if (keywords.TryPull(out TypeKeyword type))
            {
                element.SchemaTypeName = GetTypeNameFromTypeKeyword(type, keywords);
            }
            else
            {
                var item = new XmlSchemaSimpleType
                {
                    Parent = element,
                };
                element.SchemaType = item;
                HandleSimpleType(item, keywords, path);
            }

            if (compatibleTypes.Contains(CompatibleXsdType.Nillable))
            {
                element.IsNillable = true;
            }
        }

        private void HandleSimpleType(XmlSchemaSimpleType item, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);

            if (compatibleTypes.Contains(CompatibleXsdType.SimpleTypeList))
            {
                throw new NotImplementedException();
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.SimpleTypeRestriction))
            {
                HandleSimpleTypeRestriction(item, keywords, path);
            }
            else
            {
                var restriction = new XmlSchemaSimpleTypeRestriction
                {
                    Parent = item
                };
                item.Content = restriction;

                if (keywords.TryPull(out RefKeyword reference))
                {
                    restriction.BaseTypeName = GetTypeNameFromReference(reference.Reference);
                }
                else if (keywords.TryPull(out TypeKeyword typeKeyword))
                {
                    restriction.BaseTypeName = GetTypeNameFromTypeKeyword(typeKeyword, keywords);
                }
                else
                {
                    throw new JsonSchemaConvertException($"This is not a valid SimpleType {path}");
                }
            }
        }

        private void HandleAttribute(XmlSchemaAttribute attribute, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);

            if (keywords.TryPull(out RefKeyword refKeyword))
            {
                attribute.SchemaTypeName = GetTypeNameFromReference(refKeyword.Reference);
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.SimpleTypeRestriction))
            {
                var simpleType = new XmlSchemaSimpleType
                {
                    Parent = attribute
                };
                attribute.SchemaType = simpleType;

                HandleSimpleType(simpleType, keywords, path);
            }
            else if (keywords.TryPull(out TypeKeyword typeKeyword))
            {
                attribute.SchemaTypeName = GetTypeNameFromTypeKeyword(typeKeyword, keywords);
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.SimpleTypeList))
            {
                throw new NotImplementedException();
            }
        }

        private void HandleSimpleTypeRestriction(XmlSchemaSimpleType simpleType, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var restriction = new XmlSchemaSimpleTypeRestriction
            {
                Parent = simpleType
            };
            simpleType.Content = restriction;

            // the final builtin base type for this simple type refinement chain
#pragma warning disable S1854 // Unused assignments should be removed
            XmlQualifiedName targetBaseType = XmlQualifiedName.Empty;
#pragma warning restore S1854 // Unused assignments should be removed

            var restrictionsKeywordsList = new List<WorkList<IJsonSchemaKeyword>>();
            if (keywords.TryPull(out TypeKeyword type))
            {
                restriction.BaseTypeName = GetTypeNameFromTypeKeyword(type, keywords);
                restrictionsKeywordsList.Add(keywords);
                targetBaseType = restriction.BaseTypeName;
            }
            else if (keywords.TryPull(out AllOfKeyword allOf))
            {
                var baseTypeSchemaIndex = allOf.Schemas.Select((_, idx) => idx).Single(idx =>
                    _metadata.GetCompatibleTypes(path.Combine(JsonPointer.Parse($"/allOf/[{idx}]")))
                        .Contains(CompatibleXsdType.SimpleType));

                var baseTypeSchema = allOf.Schemas[baseTypeSchemaIndex];
                var restrictionSchemas = allOf.Schemas.Where((_, idx) => idx != baseTypeSchemaIndex).ToList();

                if (baseTypeSchema.TryGetKeyword(out RefKeyword baseTypeReference))
                {
                    restriction.BaseTypeName = GetTypeNameFromReference(baseTypeReference.Reference);

                    targetBaseType = FindTargetBaseTypeForSimpleTypeRestriction(baseTypeSchema);
                    if (targetBaseType == XmlQualifiedName.Empty)
                    {
                        throw new JsonSchemaConvertException($"Could not find target built-in type for SimpleType Restriction in {path}");
                    }
                }
                else if (baseTypeSchema.HasKeyword<TypeKeyword>())
                {
                    var baseTypeKeywords = baseTypeSchema.AsWorkList();
                    restriction.BaseTypeName = GetTypeNameFromTypeKeyword(baseTypeKeywords.Pull<TypeKeyword>(), baseTypeKeywords);
                    targetBaseType = restriction.BaseTypeName;
                }
                else
                {
                    // Inline base types support can be added in this if/else chain (base type may also be an inline SimpleTypeRestriction)
                    throw new JsonSchemaConvertException($"Invalid base type for SimpleType restriction {path.Combine(JsonPointer.Parse($"/allOf/[{baseTypeSchemaIndex}]"))}");
                }

                if (baseTypeSchema.HasKeyword<XsdUnhandledAttributesKeyword>())
                {
                    AddUnhandledAttributes(restriction, baseTypeSchema.Keywords.GetKeyword<XsdUnhandledAttributesKeyword>());
                }

                restrictionsKeywordsList.AddRange(restrictionSchemas.Select(restrictionSchema => restrictionSchema.AsWorkList()));
            }
            else if (keywords.TryGetKeyword(out XsdStructureKeyword xsdStructure) &&
                     keywords.TryGetKeyword(out RefKeyword refKeyword))
            {
                if (xsdStructure.Value != nameof(XmlSchemaSimpleTypeRestriction))
                {
                    throw new JsonSchemaConvertException($"This is not a valid SimpleType restriction {path}");
                }

                restriction.BaseTypeName = GetTypeNameFromReference(refKeyword.Reference);
                ValidateTargetBase(keywords, path);
            }
            else
            {
                throw new JsonSchemaConvertException($"This is not a valid SimpleType restriction {path}");
            }

            foreach (var restrictionKeywords in restrictionsKeywordsList)
            {
                var restrictionFacets = GetRestrictionFacets(restrictionKeywords, targetBaseType);
                var unhandledEnumAttributes = GetUnhandledEnumAttributes(restrictionKeywords);
                foreach (var restrictionFacet in restrictionFacets)
                {
                    restrictionFacet.Parent = restriction;
                    AddUnhandledEnumAttributesToFacet(restrictionFacet, unhandledEnumAttributes);
                    restriction.Facets.Add(restrictionFacet);
                }
            }
        }

        private void ValidateTargetBase(WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            if (FindTargetBaseTypeForSimpleTypeRestriction(keywords.AsJsonSchema()) == XmlQualifiedName.Empty)
            {
                throw new JsonSchemaConvertException($"Could not find target built-in type for SimpleType Restriction in {path}");
            }
        }

        // Search for target base type by following direct references and then a depth first search through allOf keywords
        // This should result in minimal search effort in real life as base types are usually in a direct reference or in the first subschema when using allOf
        private XmlQualifiedName FindTargetBaseTypeForSimpleTypeRestriction(JsonSchema schema)
        {
            // follow all direct references
            while (schema.TryGetKeyword(out RefKeyword reference))
            {
                schema = _schema.FollowReference(JsonPointer.Parse(reference.Reference.ToString()));
            }

            // depth first search
            if (schema.TryGetKeyword(out AllOfKeyword allOf))
            {
                foreach (var subschema in allOf.Schemas)
                {
                    var baseType = FindTargetBaseTypeForSimpleTypeRestriction(subschema);
                    if (baseType != XmlQualifiedName.Empty)
                    {
                        return baseType;
                    }
                }
            }

            var keywords = schema.AsWorkList();
            if (keywords.TryPull(out TypeKeyword typeKeyword))
            {
                return GetTypeNameFromTypeKeyword(typeKeyword, keywords);
            }

            return XmlQualifiedName.Empty;
        }

        private static IReadOnlyList<NamedKeyValuePairs> GetUnhandledEnumAttributes(WorkList<IJsonSchemaKeyword> keywords)
        {
            return keywords.Pull<XsdUnhandledEnumAttributesKeyword>()?.Properties ?? new List<NamedKeyValuePairs>();
        }

        private static IEnumerable<XmlSchemaFacet> GetRestrictionFacets(WorkList<IJsonSchemaKeyword> keywords, XmlQualifiedName type)
        {
            var facets = new List<XmlSchemaFacet>();

            foreach (var keyword in keywords.EnumerateUnhandledItems(false))
            {
                switch (keyword)
                {
                    case MaxLengthKeyword maxLength:
                        {
                            keywords.MarkAsHandled<MaxLengthKeyword>();

                            var value = maxLength.Value.ToString();
                            if (IsNumericXmlSchemaType(type))
                            {
                                facets.Add(new XmlSchemaTotalDigitsFacet { Value = value });
                            }
                            else
                            {
                                MinLengthKeyword minLength = keywords.GetKeyword<MinLengthKeyword>();
                                if (minLength?.Value == maxLength.Value)
                                {
                                    facets.Add(new XmlSchemaLengthFacet { Value = value });
                                    keywords.Pull<MinLengthKeyword>();
                                }
                                else
                                {
                                    facets.Add(new XmlSchemaMaxLengthFacet { Value = value });
                                }
                            }
                        }

                        break;
                    case MinLengthKeyword minLength:
                        {
                            keywords.MarkAsHandled<MinLengthKeyword>();

                            var value = minLength.Value.ToString();
                            var maxLength = keywords.GetKeyword<MaxLengthKeyword>();
                            if (maxLength?.Value == minLength.Value)
                            {
                                facets.Add(new XmlSchemaLengthFacet { Value = value });
                                keywords.Pull<MaxLengthKeyword>();
                            }
                            else
                            {
                                facets.Add(new XmlSchemaMinLengthFacet { Value = value });
                            }
                        }

                        break;
                    case EnumKeyword enumKeyword:
                        keywords.MarkAsHandled<EnumKeyword>();

                        foreach (var value in enumKeyword.Values)
                        {
                            facets.Add(new XmlSchemaEnumerationFacet { Value = value.ToString() });
                        }

                        break;
                    case PatternKeyword pattern:
                        keywords.MarkAsHandled<PatternKeyword>();
                        facets.Add(new XmlSchemaPatternFacet { Value = pattern.Value.ToString() });
                        break;
                    case MaximumKeyword maximum:
                        keywords.MarkAsHandled<MaximumKeyword>();
                        facets.Add(new XmlSchemaMaxInclusiveFacet { Value = maximum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case MinimumKeyword minimum:
                        keywords.MarkAsHandled<MinimumKeyword>();
                        facets.Add(new XmlSchemaMinInclusiveFacet { Value = minimum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case ExclusiveMaximumKeyword maximum:
                        keywords.MarkAsHandled<ExclusiveMaximumKeyword>();
                        facets.Add(new XmlSchemaMaxExclusiveFacet { Value = maximum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case ExclusiveMinimumKeyword minimum:
                        keywords.MarkAsHandled<ExclusiveMinimumKeyword>();
                        facets.Add(new XmlSchemaMinExclusiveFacet { Value = minimum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case MultipleOfKeyword multipleOf:
                        keywords.MarkAsHandled<MultipleOfKeyword>();
                        var fractionDigits = GetFractionDigitsFromMultipleOf(multipleOf.Value);
                        if (fractionDigits == null)
                        {
                            throw new JsonSchemaConvertException($"Could not find fraction digits from multipleOf '{multipleOf.Value}'");
                        }
                        else
                        {
                            facets.Add(new XmlSchemaFractionDigitsFacet() { Value = fractionDigits });
                        }

                        break;
                    case FormatExclusiveMinimumKeyword formatExclusiveMinimum:
                        keywords.MarkAsHandled<FormatExclusiveMinimumKeyword>();
                        facets.Add(new XmlSchemaMinExclusiveFacet() { Value = formatExclusiveMinimum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case FormatMinimumKeyword formatMinimum:
                        keywords.MarkAsHandled<FormatMinimumKeyword>();
                        facets.Add(new XmlSchemaMinInclusiveFacet() { Value = formatMinimum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case FormatExclusiveMaximumKeyword formatExclusiveMaximum:
                        keywords.MarkAsHandled<FormatExclusiveMaximumKeyword>();
                        facets.Add(new XmlSchemaMaxExclusiveFacet() { Value = formatExclusiveMaximum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case FormatMaximumKeyword formatMaximum:
                        keywords.MarkAsHandled<FormatMaximumKeyword>();
                        facets.Add(new XmlSchemaMaxInclusiveFacet() { Value = formatMaximum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case XsdTotalDigitsKeyword totalDigitsKeyword:
                        keywords.MarkAsHandled<XsdTotalDigitsKeyword>();
                        facets.Add(new XmlSchemaTotalDigitsFacet() { Value = totalDigitsKeyword.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    default:
                        continue;
                }
            }

            return facets;
        }

        private static XmlQualifiedName GetTypeNameFromTypeKeyword(TypeKeyword typeKeyword, WorkList<IJsonSchemaKeyword> keywords)
        {
            // This is the case of nillable, so we remove the Null type to be left with the actual type.
            var type = typeKeyword.Type;
            if (type.HasFlag(SchemaValueType.Null) && type > SchemaValueType.Null)
            {
                type &= ~SchemaValueType.Null;
            }

            switch (type)
            {
                case SchemaValueType.Null:
                    return null;
                case SchemaValueType.Boolean:
                case SchemaValueType.String:
                case SchemaValueType.Number:
                case SchemaValueType.Integer:
                    XmlQualifiedName typeName = SetType(typeKeyword.Type, keywords.Pull<FormatKeyword>()?.Value, keywords.Pull<XsdTypeKeyword>()?.Value);
                    return typeName;
                case SchemaValueType.Array:
                    var arrayTypeKeyword = keywords.GetKeyword<ItemsKeyword>().SingleSchema.GetKeyword<TypeKeyword>();
                    XmlQualifiedName arrayType = SetType(arrayTypeKeyword.Type, keywords.Pull<FormatKeyword>()?.Value, keywords.Pull<XsdTypeKeyword>()?.Value);
                    return arrayType;
                default:
                    throw new ArgumentOutOfRangeException($"The provided typeKeyword {typeKeyword} could not be mapped to any SchemaValueType.");
            }
        }

        private void HandleSimpleContentRestriction(XmlSchemaComplexType item, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var simpleContent = new XmlSchemaSimpleContent
            {
                Parent = item
            };
            item.ContentModel = simpleContent;

            var restriction = new XmlSchemaSimpleContentRestriction
            {
                Parent = simpleContent
            };
            simpleContent.Content = restriction;

            DeconstructSimpleContentRestriction(keywords, out var baseTypeSchema, out var baseTypeSchemaIndex, out var propertiesSchema, out var propertiesSchemaIndex);
            DeconstructSimpleContentRestrictionProperties(propertiesSchema.GetKeyword<PropertiesKeyword>(), out var valuePropertySchema, out var attributePropertiesSchemas);

            restriction.BaseTypeName = GetTypeNameFromReference(baseTypeSchema.GetKeyword<RefKeyword>().Reference);

            HandleSimpleContentRestrictionValueProperty(restriction, path, valuePropertySchema, propertiesSchemaIndex, baseTypeSchema, baseTypeSchemaIndex);
            HandleSimpleContentRestrictionAttributeProperties(restriction, path, attributePropertiesSchemas, propertiesSchemaIndex);
        }

        private void HandleSimpleContentRestrictionAttributeProperties(XmlSchemaSimpleContentRestriction restriction, JsonPointer path, List<(string Name, JsonSchema JsonSchema)> attributePropertiesSchemas, int propertiesSchemaIndex)
        {
            foreach (var (name, schema) in attributePropertiesSchemas)
            {
                var attribute = new XmlSchemaAttribute
                {
                    Parent = restriction,
                    Name = name
                };

                HandleAttribute(attribute, schema.AsWorkList(), path.Combine(JsonPointer.Parse($"/allOf/[{propertiesSchemaIndex}]/properties/{name}")));
                restriction.Attributes.Add(attribute);
            }
        }

        private void HandleSimpleContentRestrictionValueProperty(XmlSchemaSimpleContentRestriction restriction, JsonPointer path, JsonSchema valuePropertySchema, int propertiesSchemaIndex, JsonSchema baseTypeSchema, int baseTypeSchemaIndex)
        {
            if (valuePropertySchema != null)
            {
                if (valuePropertySchema.HasAnyOfKeywords(typeof(TypeKeyword), typeof(AllOfKeyword)))
                {
                    // "value" property contains a simple type
                    var valueType = new XmlSchemaSimpleType
                    {
                        Parent = restriction
                    };
                    restriction.BaseType = valueType;

                    HandleSimpleType(valueType, valuePropertySchema.AsWorkList(), path.Combine(JsonPointer.Parse($"/allOf/[{propertiesSchemaIndex}]/properties/value")));
                }
                else
                {
                    // "value" property only contains restrictions
                    var targetBaseType = FindTargetBaseTypeForSimpleTypeRestriction(baseTypeSchema);

                    var valuePropertyKeywords = valuePropertySchema.AsWorkList();
                    var restrictionFacets = GetRestrictionFacets(valuePropertyKeywords, targetBaseType);
                    var unhandledEnumAttributes = GetUnhandledEnumAttributes(valuePropertyKeywords);
                    foreach (var restrictionFacet in restrictionFacets)
                    {
                        restrictionFacet.Parent = restriction;
                        AddUnhandledEnumAttributesToFacet(restrictionFacet, unhandledEnumAttributes);
                        restriction.Facets.Add(restrictionFacet);
                    }
                }
            }
        }

        private static void DeconstructSimpleContentRestriction(WorkList<IJsonSchemaKeyword> keywords, out JsonSchema baseTypeSchema, out int baseTypeSchemaIndex, out JsonSchema propertiesSchema, out int propertiesSchemaIndex)
        {
            var allOf = keywords.Pull<AllOfKeyword>();

            baseTypeSchemaIndex = allOf.Schemas.Select((schema, idx) => (schema, idx)).Where(x => x.schema.HasKeyword<RefKeyword>()).Select(x => x.idx).Single();
            propertiesSchemaIndex = allOf.Schemas.Select((schema, idx) => (schema, idx)).Where(x => x.schema.HasKeyword<PropertiesKeyword>()).Select(x => x.idx).Single();

            baseTypeSchema = allOf.Schemas[baseTypeSchemaIndex];
            propertiesSchema = allOf.Schemas[propertiesSchemaIndex];
        }

        private static void DeconstructSimpleContentRestrictionProperties(PropertiesKeyword propertiesKeyword, out JsonSchema valuePropertySchema, out List<(string Name, JsonSchema Schema)> attributeSchemas)
        {
            var properties = propertiesKeyword.Properties;
            valuePropertySchema = properties.GetValueOrDefault("value");
            attributeSchemas = properties
                .Where(prop => prop.Key != "value")
                .Select(prop => (name: prop.Key, schema: prop.Value))
                .ToList();
        }

        private void HandleSimpleContentExtension(XmlSchemaComplexType item, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            var simpleContent = new XmlSchemaSimpleContent
            {
                Parent = item
            };
            item.ContentModel = simpleContent;

            var extension = new XmlSchemaSimpleContentExtension
            {
                Parent = simpleContent
            };
            simpleContent.Content = extension;

            var properties = keywords.Pull<PropertiesKeyword>().Properties;
            var required = keywords.Pull<RequiredKeyword>()?.Properties ?? new List<string>();
            var valuePropertySchema = properties["value"];
            var attributes = properties
                .Where(prop => prop.Key != "value")
                .Select(prop => (name: prop.Key, schema: prop.Value))
                .ToList();

            var valuePropertyKeywords = valuePropertySchema.AsWorkList();
            if (valuePropertyKeywords.TryPull(out RefKeyword reference))
            {
                extension.BaseTypeName = GetTypeNameFromReference(reference.Reference);
            }
            else
            {
                var typeKeyword = valuePropertyKeywords.Pull<TypeKeyword>();
                extension.BaseTypeName = GetTypeNameFromTypeKeyword(typeKeyword, valuePropertyKeywords);
            }

            foreach (var (name, schema) in attributes)
            {
                var attribute = new XmlSchemaAttribute
                {
                    Parent = extension,
                    Name = name
                };

                HandleAttribute(attribute, schema.AsWorkList(), path.Combine(JsonPointer.Parse($"/properties/{name}")));
                SetFixed(attribute, schema.GetKeyword<ConstKeyword>());
                SetDefault(attribute, schema.GetKeyword<DefaultKeyword>());
                SetRequired(attribute, required.Contains(name));
                extension.Attributes.Add(attribute);
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

                HandlePropertiesKeyword(item, sequence, subSchema.AsWorkList(), path.Combine(JsonPointer.Parse($"/allOf/[{i}]")));
                HandleAnyAttributeKeyword(item, subSchema.AsWorkList());

                i++;
            }

            if (sequence.Items.Count > 0)
            {
                extension.Particle = sequence;
            }

            item.ContentModel = complexContent;

            HandleAnyAttributeKeyword(extension, keywords);
        }

        private void HandlePropertiesKeyword(XmlSchemaComplexType complexType, XmlSchemaSequence sequence, WorkList<IJsonSchemaKeyword> keywords, JsonPointer path)
        {
            if (!keywords.TryPull(out PropertiesKeyword propertiesKeyword))
            {
                return;
            }

            var required = keywords.Pull<RequiredKeyword>()?.Properties ?? new List<string>();

            foreach (var (name, property) in propertiesKeyword.Properties)
            {
                var subItem = ConvertSubschema(path.Combine(JsonPointer.Parse($"/properties/{name}")), property);

                SetName(subItem, name);
                SetRequired(subItem, required.Contains(name));
                SetFixed(subItem, property.Keywords.GetKeyword<ConstKeyword>());
                SetDefault(subItem, property.Keywords.GetKeyword<DefaultKeyword>());
                CarryOccurs(subItem, property);

                switch (subItem)
                {
                    case XmlSchemaAttribute attribute:
                        attribute.Parent = complexType;
                        complexType.Attributes.Add(attribute);
                        break;
                    case XmlSchemaElement element:
                        element.Parent = sequence;
                        sequence.Items.Add(element);
                        AddUnhandledAttributes(element, property.Keywords.GetKeyword<XsdUnhandledAttributesKeyword>());
                        break;
                    default:
                        throw new NotImplementedException();
                }
            }
        }

        private static void CarryOccurs(XmlSchemaObject subItem, JsonSchema property)
        {
            if (subItem is not XmlSchemaParticle particle)
            {
                return;
            }

            if (property.Keywords.TryGetKeyword(out XsdMinOccursKeyword minOccursKeyword))
            {
                particle.MinOccurs = minOccursKeyword.Value;
            }

            if (property.Keywords.TryGetKeyword(out XsdMaxOccursKeyword maxOccursKeyword))
            {
                particle.MaxOccursString = maxOccursKeyword.Value;
            }
        }

        private XmlSchemaObject ConvertSubschema(JsonPointer path, JsonSchema schema)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);
            string arrayMinOccurs = null;
            string arrayMaxOccurs = null;

            if (compatibleTypes.Contains(CompatibleXsdType.Array))
            {
                if (schema.TryGetKeyword(out MinItemsKeyword minItemsKeyword))
                {
                    arrayMinOccurs = minItemsKeyword.Value.ToString();
                }

                arrayMaxOccurs = schema.TryGetKeyword(out MaxItemsKeyword maxItemsKeyword) ? maxItemsKeyword.Value.ToString() : "unbounded";
            }

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

                    if (arrayMinOccurs != null && arrayMinOccurs != "1")
                    {
                        item.MinOccursString = arrayMinOccurs;
                    }

                    if (arrayMaxOccurs != null)
                    {
                        item.MaxOccursString = arrayMaxOccurs;
                    }

                    return item;
                }
            }

            if (compatibleTypes.Contains(CompatibleXsdType.ComplexType))
            {
                var item = new XmlSchemaElement();
                HandleComplexType(item, schema.AsWorkList(), path);

                if (arrayMinOccurs != null && arrayMinOccurs != "1")
                {
                    item.MinOccursString = arrayMinOccurs;
                }

                if (arrayMaxOccurs != null)
                {
                    item.MaxOccursString = arrayMaxOccurs;
                }

                return item;
            }

            throw new NotImplementedException();
        }

        private static void HandleAnyAttributeKeyword(XmlSchemaComplexType complexType, WorkList<IJsonSchemaKeyword> keywords)
        {
            if (!keywords.TryPull(out XsdAnyAttributeKeyword anyAttributeKeyword))
            {
                return;
            }

            XmlSchemaAnyAttribute xmlSchemaAnyAttribute = new XmlSchemaAnyAttribute
            {
                Parent = complexType,
                Id = anyAttributeKeyword.Id,
                Namespace = anyAttributeKeyword.Namespace,
                ProcessContents = Enum.Parse<XmlSchemaContentProcessing>(anyAttributeKeyword.ProcessContent)
            };
            complexType.AnyAttribute = xmlSchemaAnyAttribute;
        }

        private static void HandleAnyAttributeKeyword(XmlSchemaComplexContentExtension complexContentExtension, WorkList<IJsonSchemaKeyword> keywords)
        {
            if (!keywords.TryPull(out XsdAnyAttributeKeyword anyAttributeKeyword))
            {
                return;
            }

            XmlSchemaAnyAttribute xmlSchemaAnyAttribute = new XmlSchemaAnyAttribute
            {
                Parent = complexContentExtension,
                Id = anyAttributeKeyword.Id,
                Namespace = anyAttributeKeyword.Namespace,
                ProcessContents = Enum.Parse<XmlSchemaContentProcessing>(anyAttributeKeyword.ProcessContent)
            };
            complexContentExtension.AnyAttribute = xmlSchemaAnyAttribute;
        }

        private void AddUnhandledAttributes(XmlSchemaObject item, XsdUnhandledAttributesKeyword xsdUnhandledAttributesKeyword)
        {
            if (xsdUnhandledAttributesKeyword == null)
            {
                return;
            }

            if (item is not XmlSchemaAnnotated annotatedItem)
            {
                throw new ArgumentException("Unhandled attributes must be added to an annotated xml schema object.");
            }

            var unhandledAttributes = new List<XmlAttribute>();
            foreach (var (name, value) in xsdUnhandledAttributesKeyword.Properties)
            {
                XmlAttribute attribute = CreateAttribute(name, value);
                unhandledAttributes.Add(attribute);
            }

            annotatedItem.UnhandledAttributes = unhandledAttributes.ToArray();
        }

        private void AddUnhandledAttributes(XmlSchema xmlSchema, XsdUnhandledAttributesKeyword xsdUnhandledAttributesKeyword)
        {
            if (xsdUnhandledAttributesKeyword == null)
            {
                return;
            }

            var unhandledAttributes = new List<XmlAttribute>();
            foreach (var (name, value) in xsdUnhandledAttributesKeyword.Properties)
            {
                XmlAttribute attribute = CreateAttribute(name, value);
                unhandledAttributes.Add(attribute);
            }

            xmlSchema.UnhandledAttributes = unhandledAttributes.ToArray();
        }

        private void AddUnhandledEnumAttributesToFacet(XmlSchemaFacet xmlSchemaFacet, IReadOnlyList<NamedKeyValuePairs> unhandledEnumAttributes)
        {
            if (unhandledEnumAttributes.Count == 0)
            {
                return;
            }

            var namedKeyValuePairs = unhandledEnumAttributes.First(a => a.Name == xmlSchemaFacet.Value);

            if (namedKeyValuePairs == null)
            {
                return;
            }

            var unhandledEnumAttributesForFacet = new List<XmlAttribute>();
            foreach (var (key, value) in namedKeyValuePairs.Properties)
            {
                var xmlUnhandledEnumAttribute = CreateAttribute(key, value);
                unhandledEnumAttributesForFacet.Add(xmlUnhandledEnumAttribute);
            }

            xmlSchemaFacet.UnhandledAttributes = unhandledEnumAttributesForFacet.ToArray();
        }

        private XmlAttribute CreateAttribute(string name, string value)
        {
            string prefix = null;
            string localName;
            string @namespace = null;

            string[] nameParts = name.Split(':', 2);
            if (nameParts.Length == 2)
            {
                prefix = nameParts[0];
                localName = nameParts[1];

                @namespace = prefix == "xml" ? @"http://www.w3.org/XML/1998/namespace" : _namespaces[prefix];
            }
            else
            {
                localName = name;
            }

            XmlAttribute attribute = _xmlFactoryDocument.CreateAttribute(prefix, localName, @namespace);
            attribute.Value = value;

            return attribute;
        }

        private static XmlQualifiedName GetTypeNameFromReference(Uri reference)
        {
            var pointer = JsonPointer.Parse(reference.ToString());
            if (pointer.Segments.Length != 2 || (pointer.Segments[0].Value != "$defs" && pointer.Segments[0].Value != "definitions"))
            {
                throw new JsonSchemaConvertException("Reference uri must point to a definition in $defs/definitions to be used as TypeName");
            }

            return new XmlQualifiedName(pointer.Segments[1].Value);
        }

        private static XmlQualifiedName GetTypeNameFromArray(JsonSchema schema, WorkList<IJsonSchemaKeyword> keywords)
        {
            if (schema.TryGetKeyword<TypeKeyword>(out TypeKeyword typeKeyword))
            {
                return GetTypeNameFromTypeKeyword(typeKeyword, keywords);
            }

            if (schema.TryGetKeyword<RefKeyword>(out RefKeyword refKeyword))
            {
                return GetTypeNameFromReference(refKeyword.Reference);
            }

            // Nillable array
            if (schema.TryGetKeyword<OneOfKeyword>(out var oneOfKeyword))
            {
                var refKeywordSubSchema = oneOfKeyword.GetSubschemas().FirstOrDefault(s => s.Keywords.HasKeyword<RefKeyword>());
                return GetTypeNameFromReference(refKeywordSubSchema.GetKeyword<RefKeyword>().Reference);
            }

            return new XmlQualifiedName();
        }

        private static void SetName(XmlSchemaObject item, string name)
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

        private static void SetRequired(XmlSchemaObject item, bool isRequired)
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

        private static void SetFixed(XmlSchemaObject item, ConstKeyword constKeyword)
        {
            if (constKeyword is null)
            {
                return;
            }

            switch (item)
            {
                case XmlSchemaAttribute attribute:
                    attribute.FixedValue = constKeyword.Value.ToString();
                    break;
            }
        }

        private static void SetDefault(XmlSchemaObject item, DefaultKeyword defaultKeyword)
        {
            if (defaultKeyword is null)
            {
                return;
            }

            switch (item)
            {
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
            switch (format?.Key)
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

            // Fallback to open string value
            return "string";
        }

        private static int GetKeywordSubSchemaIndex<T>(IReadOnlyList<JsonSchema> schemas)
        {
            return schemas.Select((schema, idx) => (schema, idx)).Where(x => x.schema.HasKeyword<T>()).Select(x => x.idx).Single();
        }

        private static bool IsNumericXmlSchemaType(XmlQualifiedName type)
        {
            if (type.IsEmpty || type.Namespace != KnownXmlNamespaces.XmlSchemaNamespace)
            {
                return false;
            }

            switch (type.Name)
            {
                case "integer":
                case "nonPositiveInteger":
                case "negativeInteger":
                case "nonNegativeInteger":
                case "positiveInteger":
                case "long":
                case "int":
                case "short":
                case "byte":
                case "unsignedLong":
                case "unsignedInt":
                case "unsignedShort":
                case "unsignedByte":
                case "decimal":
                case "float":
                case "double":
                    return true;
            }

            return false;
        }

        private static string GetFractionDigitsFromMultipleOf(decimal value)
        {
            var digits = 0;

            while (value < 1)
            {
                value *= 10;
                digits++;
            }

            return value == 1 ? digits.ToString() : null;
        }
    }
}
