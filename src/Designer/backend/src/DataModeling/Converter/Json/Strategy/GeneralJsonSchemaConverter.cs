using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Xml;
using System.Xml.Schema;
using System.Xml.Serialization;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;
using Json.Schema.Keywords;

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

            foreach (var kd in keywords.EnumerateUnhandledItems(false))
            {
                switch (kd.Handler)
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

                    case InfoKeyword:
                        keywords.MarkAsHandled<InfoKeyword>();
                        HandleInfoKeyword(kd);
                        break;

                    case DefsKeyword:
                        keywords.MarkAsHandled<DefsKeyword>();
                        HandleDefinitions(JsonPointer.Parse($"#/{kd.Handler.Name}"), kd.GetPropertiesDictionary());
                        break;

                    case IKeywordHandler handler when handler.Name == "definitions":
                        keywords.MarkAsHandledByName("definitions");
                        HandleDefinitions(JsonPointer.Parse($"#/{kd.Handler.Name}"), kd.GetPropertiesDictionary());
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
                    case TitleKeyword:
                        keywords.MarkAsHandled<TitleKeyword>();
                        break;

                    case CommentKeyword:
                        keywords.MarkAsHandled<CommentKeyword>();
                        break;
                }
            }

            var unhandledKeywords = keywords.EnumerateUnhandledItems().ToList();
            if (unhandledKeywords.Count > 0)
            {
                throw new ArgumentException(
                    $"Unhandled keyword(s) in root JSON Schema '{string.Join("', '", unhandledKeywords.Select(kd => kd.Handler.Name))}'"
                );
            }

            return CompileSchema(_xsd);
        }

        private static XmlSchema CompileSchema(XmlSchema schema)
        {
            try
            {
                var schemaToCompile = string.IsNullOrWhiteSpace(schema.TargetNamespace)
                    ? schema
                    : ReloadXsdSchema(schema);
                var schemaSet = new XmlSchemaSet();
                schemaSet.Add(schemaToCompile);
                schemaSet.Compile();

                return schema;
            }
            catch (XmlSchemaException e)
            {
                throw new JsonSchemaConvertException("Produced XSD is not valid. Can't compile", e);
            }
        }

        private static XmlSchema ReloadXsdSchema(XmlSchema schema)
        {
            var serializer = new XmlSerializer(typeof(XmlSchema));
            using var memoryStream = new MemoryStream();
            using var streamWriter = new StreamWriter(memoryStream, System.Text.Encoding.UTF8);
            serializer.Serialize(streamWriter, schema);
            memoryStream.Seek(0, SeekOrigin.Begin);
            using XmlReader xmlReader = XmlReader.Create(memoryStream);
            return XmlSchema.Read(xmlReader, (_, _) => { });
        }

        private void HandleSchemaAttributes()
        {
            if (_schema.TryGetKeyword<XsdSchemaAttributesKeyword>(out var attributesKd))
            {
                foreach (var (name, value) in (List<(string Name, string Value)>)attributesKd.Value)
                {
                    switch (name)
                    {
                        case "AttributeFormDefault":
                            _xsd.AttributeFormDefault = Enum.TryParse(
                                value,
                                true,
                                out XmlSchemaForm xmlSchemaFormAttribute
                            )
                                ? xmlSchemaFormAttribute
                                : XmlSchemaForm.Unqualified;
                            break;
                        case "ElementFormDefault":
                            _xsd.ElementFormDefault = Enum.TryParse(value, true, out XmlSchemaForm xmlSchemaFormElement)
                                ? xmlSchemaFormElement
                                : XmlSchemaForm.Qualified;
                            break;
                        case "BlockDefault":
                            _xsd.BlockDefault = Enum.TryParse(
                                value,
                                true,
                                out XmlSchemaDerivationMethod xmlSchemaDerivationBlock
                            )
                                ? xmlSchemaDerivationBlock
                                : XmlSchemaDerivationMethod.None;
                            break;
                        case "FinalDefault":
                            _xsd.FinalDefault = Enum.TryParse(
                                value,
                                true,
                                out XmlSchemaDerivationMethod xmlSchemaDerivationFinal
                            )
                                ? xmlSchemaDerivationFinal
                                : XmlSchemaDerivationMethod.None;
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
            AddUnhandledAttributes(_xsd, _schema.GetKeywords().FindKeywordByHandler<XsdUnhandledAttributesKeyword>());
        }

        private void HandleNamespaces()
        {
            _namespaces = new Dictionary<string, string>();

            if (_schema.TryGetKeyword<XsdNamespacesKeyword>(out var namespacesKd))
            {
                foreach (var (prefix, ns) in (List<(string Prefix, string Ns)>)namespacesKd.Value)
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

        private void HandleInfoKeyword(KeywordData infoKd)
        {
            var markup = new List<XmlNode>();
            var xsdNamespace = _xsd
                .Namespaces.ToArray()
                .First(ns => ns.Namespace == KnownXmlNamespaces.XmlSchemaNamespace);

            foreach (var property in infoKd.RawValue.EnumerateObject())
            {
                var element = _xmlFactoryDocument.CreateElement(xsdNamespace.Name, "attribute", xsdNamespace.Namespace);
                element.SetAttribute("name", property.Name);
                element.SetAttribute("fixed", property.Value.GetString());
                markup.Add(element);
            }

            var annotation = new XmlSchemaAnnotation { Parent = _xsd };
            _xsd.Items.Add(annotation);

            var documentation = new XmlSchemaDocumentation { Parent = annotation, Markup = markup.ToArray() };
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
                var complexType = new XmlSchemaComplexType { Parent = _xsd };

                HandleComplexType(complexType, definition.AsWorkList(), path);
                SetName(complexType, name);
                AddUnhandledAttributes(
                    complexType,
                    definition.GetKeywords().FindKeywordByHandler<XsdUnhandledAttributesKeyword>()
                );
                _xsd.Items.Add(complexType);
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.SimpleType))
            {
                var simpleType = new XmlSchemaSimpleType { Parent = _xsd };

                HandleSimpleType(simpleType, definition.AsWorkList(), path);
                SetName(simpleType, name);
                AddUnhandledAttributes(
                    simpleType,
                    definition.GetKeywords().FindKeywordByHandler<XsdUnhandledAttributesKeyword>()
                );
                _xsd.Items.Add(simpleType);
            }
        }

        private void HandleRootMessage(WorkList keywords)
        {
            var root = new XmlSchemaElement { Parent = _xsd, Name = _metadata.MessageName };
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
                    throw new ArgumentException(
                        "Schema has inlined root element, but it is not defined as being a valid SimpleType or ComplexType"
                    );
                }
            }
            else
            {
                var allOfKd = _schema.FindKeywordByHandler<AllOfKeyword>();
                var anyOfKd = _schema.FindKeywordByHandler<AnyOfKeyword>();
                var oneOfKd = _schema.FindKeywordByHandler<OneOfKeyword>();

                var firstSubSchema =
                    allOfKd?.GetSubSchemas()[0] ?? anyOfKd?.GetSubSchemas()[0] ?? oneOfKd?.GetSubSchemas()[0];

                var refKd = firstSubSchema.FindKeywordByHandler<RefKeyword>();

                root.SchemaTypeName = GetTypeNameFromReference(refKd.GetRefUri());
            }
        }

        private void HandleComplexType(XmlSchemaComplexType item, WorkList keywords, JsonPointer path)
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
                var sequence = new XmlSchemaSequence { Parent = item };

                if (keywords.TryPull<AllOfKeyword>(out var allOfKd))
                {
                    var subSchemas = allOfKd.GetSubSchemas();
                    var i = 0;
                    foreach (var subSchema in subSchemas)
                    {
                        if (subSchema.HasKeyword<RefKeyword>())
                        {
                            i++;
                            continue;
                        }

                        HandlePropertiesKeyword(
                            item,
                            sequence,
                            subSchema.AsWorkList(),
                            path.Combine(JsonPointer.Parse($"/allOf/[{i}]"))
                        );

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

        private void HandleComplexType(XmlSchemaElement element, WorkList keywords, JsonPointer path)
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
                var itemsKd = keywords.FirstOrDefault(kd => kd.Handler is ItemsKeyword);
                var singleSchema = itemsKd.GetSingleSubSchema();
                if (singleSchema.HasKeyword<PropertiesKeyword>())
                {
                    var item = new XmlSchemaComplexType { Parent = element };
                    element.SchemaType = item;
                    HandleComplexType(item, singleSchema.AsWorkList(), path);
                }
                else
                {
                    element.SchemaTypeName = GetTypeNameFromArray(singleSchema, singleSchema.AsWorkList());
                }
            }
            else if (keywords.TryPull<RefKeyword>(out var refKd))
            {
                element.SchemaTypeName = GetTypeNameFromReference(refKd.GetRefUri());
            }
            else
            {
                var item = new XmlSchemaComplexType { Parent = element };
                element.SchemaType = item;
                HandleComplexType(item, keywords, path);
            }
        }

        private void HandleNillableComplexType(XmlSchemaElement element, JsonPointer path, WorkList keywords)
        {
            var oneOfKd = keywords.FirstOrDefault(kd => kd.Handler is OneOfKeyword);

            var handled = oneOfKd is null
                ? TryHandleNonCompositionNillableComplexType(element, path, keywords)
                : TryHandleCompositionNillableComplexType(element, oneOfKd, path);

            if (!handled)
            {
                throw new JsonSchemaConvertException(
                    "The provided schema could not be handled as a nillable complex type."
                );
            }

            element.IsNillable = true;
        }

        private bool TryHandleNonCompositionNillableComplexType(
            XmlSchemaElement element,
            JsonPointer path,
            WorkList keywords
        )
        {
            var nillableKd = keywords.FirstOrDefault(kd => kd.Handler is XsdNillableKeyword);
            if (nillableKd != null && (bool)nillableKd.Value && keywords.Any(kd => kd.Handler is RefKeyword))
            {
                var refKd = keywords.First(kd => kd.Handler is RefKeyword);
                element.SchemaTypeName = GetTypeNameFromReference(refKd.GetRefUri());
                return true;
            }

            if (nillableKd != null && (bool)nillableKd.Value && keywords.Any(kd => kd.Handler is PropertiesKeyword))
            {
                var item = new XmlSchemaComplexType { Parent = element };
                element.SchemaType = item;

                HandleComplexType(item, keywords, path);
                return true;
            }

            var typeKd = keywords.FirstOrDefault(kd => kd.Handler is TypeKeyword);
            var itemsKd = keywords.FirstOrDefault(kd => kd.Handler is ItemsKeyword);

            if (typeKd == null && itemsKd == null)
            {
                return false;
            }

            if (_metadata.GetCompatibleTypes(path).Contains(CompatibleXsdType.ComplexContentExtension))
            {
                var item = new XmlSchemaComplexType { Parent = element };
                element.SchemaType = item;

                var singleSchema = itemsKd.GetSingleSubSchema();
                HandleComplexType(item, singleSchema.AsWorkList(), path);
            }
            else
            {
                var singleSchema = itemsKd.GetSingleSubSchema();
                var oneOfKd = singleSchema.FindKeywordByHandler<OneOfKeyword>();
                if (oneOfKd is null && singleSchema.TryGetKeyword<RefKeyword>(out var itemsRefKd))
                {
                    element.SchemaTypeName = GetTypeNameFromReference(itemsRefKd.GetRefUri());
                }
                else
                {
                    var innerOneOfKd = singleSchema.FindKeywordByHandler<OneOfKeyword>();
                    var innerOneOfSchemas = innerOneOfKd.GetSubSchemas();
                    var refSubSchema = innerOneOfSchemas.FirstOrDefault(s => s.HasKeyword<RefKeyword>());
                    var innerRefKd = refSubSchema.FindKeywordByHandler<RefKeyword>();
                    element.SchemaTypeName = GetTypeNameFromReference(innerRefKd.GetRefUri());
                }
            }

            return true;
        }

        private bool TryHandleCompositionNillableComplexType(
            XmlSchemaElement element,
            KeywordData oneOfKd,
            JsonPointer path
        )
        {
            var oneOfSchemas = oneOfKd.GetSubSchemas();
            var refKeywordSubSchema = oneOfSchemas.FirstOrDefault(s => s.GetKeywords().HasKeyword<RefKeyword>());
            var propertiesKeywordSubSchema = oneOfSchemas.FirstOrDefault(s =>
                s.GetKeywords().HasKeyword<PropertiesKeyword>()
            );

            // Element with type reference to a ComplexType
            if (refKeywordSubSchema != null)
            {
                element.SchemaTypeName = GetTypeNameFromReference(
                    refKeywordSubSchema.FindKeywordByHandler<RefKeyword>().GetRefUri()
                );
                return true;
            }

            // Element with inline ComplexType
            if (propertiesKeywordSubSchema != null)
            {
                var item = new XmlSchemaComplexType { Parent = element };
                element.SchemaType = item;

                var propertiesKeywordSubSchemaIndex = GetKeywordSubSchemaIndex<PropertiesKeyword>(oneOfSchemas);
                HandleComplexType(
                    item,
                    propertiesKeywordSubSchema.AsWorkList(),
                    path.Combine(JsonPointer.Parse($"/oneOf/[{propertiesKeywordSubSchemaIndex}]"))
                );
                return true;
            }

            return false;
        }

        private void HandleSimpleType(XmlSchemaElement element, WorkList keywords, JsonPointer path)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);
            if (compatibleTypes.Contains(CompatibleXsdType.Array))
            {
                var itemsKd = keywords.FirstOrDefault(kd => kd.Handler is ItemsKeyword);
                var singleSchema = itemsKd.GetSingleSubSchema();
                element.SchemaTypeName = GetTypeNameFromArray(singleSchema, singleSchema.AsWorkList());
            }
            else if (
                compatibleTypes.Contains(CompatibleXsdType.Nillable) && keywords.TryPull<OneOfKeyword>(out var oneOfKd)
            )
            {
                var oneOfSchemas = oneOfKd.GetSubSchemas();
                var refKeywordSubSchema = oneOfSchemas.FirstOrDefault(s => s.GetKeywords().HasKeyword<RefKeyword>());
                element.SchemaTypeName = GetTypeNameFromReference(
                    refKeywordSubSchema.FindKeywordByHandler<RefKeyword>().GetRefUri()
                );
                element.IsNillable = true;
            }
            else if (keywords.TryPull<RefKeyword>(out var refKd))
            {
                element.SchemaTypeName = GetTypeNameFromReference(refKd.GetRefUri());
            }
            else if (keywords.TryPull<TypeKeyword>(out var typeKd))
            {
                element.SchemaTypeName = GetTypeNameFromTypeKeyword(typeKd, keywords);
            }
            else
            {
                var item = new XmlSchemaSimpleType { Parent = element };
                element.SchemaType = item;
                HandleSimpleType(item, keywords, path);
            }

            if (compatibleTypes.Contains(CompatibleXsdType.Nillable))
            {
                element.IsNillable = true;
            }
        }

        private void HandleSimpleType(XmlSchemaSimpleType item, WorkList keywords, JsonPointer path)
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
                var restriction = new XmlSchemaSimpleTypeRestriction { Parent = item };
                item.Content = restriction;

                if (keywords.TryPull<RefKeyword>(out var refKd))
                {
                    restriction.BaseTypeName = GetTypeNameFromReference(refKd.GetRefUri());
                }
                else if (keywords.TryPull<TypeKeyword>(out var typeKd))
                {
                    restriction.BaseTypeName = GetTypeNameFromTypeKeyword(typeKd, keywords);
                }
                else
                {
                    throw new JsonSchemaConvertException($"This is not a valid SimpleType {path}");
                }
            }
        }

        private void HandleAttribute(XmlSchemaAttribute attribute, WorkList keywords, JsonPointer path)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);

            if (keywords.TryPull<RefKeyword>(out var refKd))
            {
                attribute.SchemaTypeName = GetTypeNameFromReference(refKd.GetRefUri());
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.SimpleTypeRestriction))
            {
                var simpleType = new XmlSchemaSimpleType { Parent = attribute };
                attribute.SchemaType = simpleType;

                HandleSimpleType(simpleType, keywords, path);
            }
            else if (keywords.TryPull<TypeKeyword>(out var typeKd))
            {
                attribute.SchemaTypeName = GetTypeNameFromTypeKeyword(typeKd, keywords);
            }
            else if (compatibleTypes.Contains(CompatibleXsdType.SimpleTypeList))
            {
                throw new NotImplementedException();
            }
        }

        private void HandleSimpleTypeRestriction(XmlSchemaSimpleType simpleType, WorkList keywords, JsonPointer path)
        {
            var restriction = new XmlSchemaSimpleTypeRestriction { Parent = simpleType };
            simpleType.Content = restriction;

            // the final builtin base type for this simple type refinement chain
#pragma warning disable S1854 // Unused assignments should be removed
            XmlQualifiedName targetBaseType = XmlQualifiedName.Empty;
#pragma warning restore S1854 // Unused assignments should be removed

            var restrictionsKeywordsList = new List<WorkList>();
            if (keywords.TryPull<TypeKeyword>(out var typeKd))
            {
                restriction.BaseTypeName = GetTypeNameFromTypeKeyword(typeKd, keywords);
                restrictionsKeywordsList.Add(keywords);
                targetBaseType = restriction.BaseTypeName;
            }
            else if (keywords.TryPull<AllOfKeyword>(out var allOfKd))
            {
                var allOfSchemas = allOfKd.GetSubSchemas();
                var baseTypeSchemaIndex = allOfSchemas
                    .Select((_, idx) => idx)
                    .Single(idx =>
                        _metadata
                            .GetCompatibleTypes(path.Combine(JsonPointer.Parse($"/allOf/[{idx}]")))
                            .Contains(CompatibleXsdType.SimpleType)
                    );

                var baseTypeSchema = allOfSchemas[baseTypeSchemaIndex];
                var restrictionSchemas = allOfSchemas.Where((_, idx) => idx != baseTypeSchemaIndex).ToList();

                if (baseTypeSchema.TryGetKeyword<RefKeyword>(out var baseTypeRefKd))
                {
                    restriction.BaseTypeName = GetTypeNameFromReference(baseTypeRefKd.GetRefUri());

                    targetBaseType = FindTargetBaseTypeForSimpleTypeRestriction(baseTypeSchema);
                    if (targetBaseType == XmlQualifiedName.Empty)
                    {
                        throw new JsonSchemaConvertException(
                            $"Could not find target built-in type for SimpleType Restriction in {path}"
                        );
                    }
                }
                else if (baseTypeSchema.HasKeyword<TypeKeyword>())
                {
                    var baseTypeKeywords = baseTypeSchema.AsWorkList();
                    var baseTypeTypeKd = baseTypeKeywords.Pull<TypeKeyword>();
                    restriction.BaseTypeName = GetTypeNameFromTypeKeyword(baseTypeTypeKd, baseTypeKeywords);
                    targetBaseType = restriction.BaseTypeName;
                }
                else
                {
                    // Inline base types support can be added in this if/else chain (base type may also be an inline SimpleTypeRestriction)
                    throw new JsonSchemaConvertException(
                        $"Invalid base type for SimpleType restriction {path.Combine(JsonPointer.Parse($"/allOf/[{baseTypeSchemaIndex}]"))}"
                    );
                }

                if (baseTypeSchema.HasKeyword<XsdUnhandledAttributesKeyword>())
                {
                    AddUnhandledAttributes(
                        restriction,
                        baseTypeSchema.GetKeywords().FindKeywordByHandler<XsdUnhandledAttributesKeyword>()
                    );
                }

                restrictionsKeywordsList.AddRange(
                    restrictionSchemas.Select(restrictionSchema => restrictionSchema.AsWorkList())
                );
            }
            else if (
                keywords.Any(kd => kd.Handler is XsdStructureKeyword) && keywords.Any(kd => kd.Handler is RefKeyword)
            )
            {
                var xsdStructureKd = keywords.First(kd => kd.Handler is XsdStructureKeyword);
                var refKd = keywords.First(kd => kd.Handler is RefKeyword);

                if ((string)xsdStructureKd.Value != nameof(XmlSchemaSimpleTypeRestriction))
                {
                    throw new JsonSchemaConvertException($"This is not a valid SimpleType restriction {path}");
                }

                restriction.BaseTypeName = GetTypeNameFromReference(refKd.GetRefUri());
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

        private void ValidateTargetBase(WorkList keywords, JsonPointer path)
        {
            if (FindTargetBaseTypeForSimpleTypeRestriction(keywords.AsJsonSchema()) == XmlQualifiedName.Empty)
            {
                throw new JsonSchemaConvertException(
                    $"Could not find target built-in type for SimpleType Restriction in {path}"
                );
            }
        }

        // Search for target base type by following direct references and then a depth first search through allOf keywords
        // This should result in minimal search effort in real life as base types are usually in a direct reference or in the first subschema when using allOf
        private XmlQualifiedName FindTargetBaseTypeForSimpleTypeRestriction(JsonSchema schema)
        {
            // follow all direct references
            while (schema.TryGetKeyword<RefKeyword>(out var refKd))
            {
                schema = _schema.FollowReference(JsonPointer.Parse(refKd.GetRefString()));
            }

            // depth first search
            if (schema.TryGetKeyword<AllOfKeyword>(out var allOfKd))
            {
                foreach (var subschema in allOfKd.GetSubSchemas())
                {
                    var baseType = FindTargetBaseTypeForSimpleTypeRestriction(subschema);
                    if (baseType != XmlQualifiedName.Empty)
                    {
                        return baseType;
                    }
                }
            }

            var workList = schema.AsWorkList();
            if (workList.TryPull<TypeKeyword>(out var typeKd))
            {
                return GetTypeNameFromTypeKeyword(typeKd, workList);
            }

            return XmlQualifiedName.Empty;
        }

        private static IReadOnlyList<NamedKeyValuePairs> GetUnhandledEnumAttributes(WorkList keywords)
        {
            var kd = keywords.Pull<XsdUnhandledEnumAttributesKeyword>();
            return kd != null ? (List<NamedKeyValuePairs>)kd.Value : new List<NamedKeyValuePairs>();
        }

        private static IEnumerable<XmlSchemaFacet> GetRestrictionFacets(WorkList keywords, XmlQualifiedName type)
        {
            var facets = new List<XmlSchemaFacet>();

            foreach (var kd in keywords.EnumerateUnhandledItems(false))
            {
                switch (kd.Handler)
                {
                    case MaxLengthKeyword:
                        {
                            keywords.MarkAsHandled<MaxLengthKeyword>();

                            var maxLengthValue = kd.GetLongValue();
                            var value = maxLengthValue.ToString();
                            if (IsNumericXmlSchemaType(type))
                            {
                                facets.Add(new XmlSchemaTotalDigitsFacet { Value = value });
                            }
                            else
                            {
                                var minLengthKd = keywords.FirstOrDefault(k => k.Handler is MinLengthKeyword);
                                if (minLengthKd != null && minLengthKd.GetLongValue() == maxLengthValue)
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
                    case MinLengthKeyword:
                        {
                            keywords.MarkAsHandled<MinLengthKeyword>();

                            var minLengthValue = kd.GetLongValue();
                            var value = minLengthValue.ToString();
                            var maxLengthKd = keywords.FirstOrDefault(k => k.Handler is MaxLengthKeyword);
                            if (maxLengthKd != null && maxLengthKd.GetLongValue() == minLengthValue)
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
                    case EnumKeyword:
                        keywords.MarkAsHandled<EnumKeyword>();

                        foreach (var enumValue in kd.RawValue.EnumerateArray())
                        {
                            facets.Add(new XmlSchemaEnumerationFacet { Value = enumValue.ToString() });
                        }

                        break;
                    case PatternKeyword:
                        keywords.MarkAsHandled<PatternKeyword>();
                        facets.Add(
                            new XmlSchemaPatternFacet
                            {
                                Value = ((System.Text.RegularExpressions.Regex)kd.Value).ToString(),
                            }
                        );
                        break;
                    case MaximumKeyword:
                        keywords.MarkAsHandled<MaximumKeyword>();
                        facets.Add(
                            new XmlSchemaMaxInclusiveFacet
                            {
                                Value = kd.GetDecimalValue().ToString(NumberFormatInfo.InvariantInfo),
                            }
                        );
                        break;
                    case MinimumKeyword:
                        keywords.MarkAsHandled<MinimumKeyword>();
                        facets.Add(
                            new XmlSchemaMinInclusiveFacet
                            {
                                Value = kd.GetDecimalValue().ToString(NumberFormatInfo.InvariantInfo),
                            }
                        );
                        break;
                    case ExclusiveMaximumKeyword:
                        keywords.MarkAsHandled<ExclusiveMaximumKeyword>();
                        facets.Add(
                            new XmlSchemaMaxExclusiveFacet
                            {
                                Value = kd.GetDecimalValue().ToString(NumberFormatInfo.InvariantInfo),
                            }
                        );
                        break;
                    case ExclusiveMinimumKeyword:
                        keywords.MarkAsHandled<ExclusiveMinimumKeyword>();
                        facets.Add(
                            new XmlSchemaMinExclusiveFacet
                            {
                                Value = kd.GetDecimalValue().ToString(NumberFormatInfo.InvariantInfo),
                            }
                        );
                        break;
                    case MultipleOfKeyword:
                        keywords.MarkAsHandled<MultipleOfKeyword>();
                        var fractionDigits = GetFractionDigitsFromMultipleOf(kd.GetDecimalValue());
                        if (fractionDigits == null)
                        {
                            throw new JsonSchemaConvertException(
                                $"Could not find fraction digits from multipleOf '{kd.GetDecimalValue()}'"
                            );
                        }
                        else
                        {
                            facets.Add(new XmlSchemaFractionDigitsFacet() { Value = fractionDigits });
                        }

                        break;
                    case FormatExclusiveMinimumKeyword:
                        keywords.MarkAsHandled<FormatExclusiveMinimumKeyword>();
                        facets.Add(
                            new XmlSchemaMinExclusiveFacet()
                            {
                                Value = ((string)kd.Value).ToString(NumberFormatInfo.InvariantInfo),
                            }
                        );
                        break;
                    case FormatMinimumKeyword:
                        keywords.MarkAsHandled<FormatMinimumKeyword>();
                        facets.Add(
                            new XmlSchemaMinInclusiveFacet()
                            {
                                Value = ((string)kd.Value).ToString(NumberFormatInfo.InvariantInfo),
                            }
                        );
                        break;
                    case FormatExclusiveMaximumKeyword:
                        keywords.MarkAsHandled<FormatExclusiveMaximumKeyword>();
                        facets.Add(
                            new XmlSchemaMaxExclusiveFacet()
                            {
                                Value = ((string)kd.Value).ToString(NumberFormatInfo.InvariantInfo),
                            }
                        );
                        break;
                    case FormatMaximumKeyword:
                        keywords.MarkAsHandled<FormatMaximumKeyword>();
                        facets.Add(
                            new XmlSchemaMaxInclusiveFacet()
                            {
                                Value = ((string)kd.Value).ToString(NumberFormatInfo.InvariantInfo),
                            }
                        );
                        break;
                    case XsdTotalDigitsKeyword:
                        keywords.MarkAsHandled<XsdTotalDigitsKeyword>();
                        facets.Add(
                            new XmlSchemaTotalDigitsFacet()
                            {
                                Value = ((uint)kd.Value).ToString(NumberFormatInfo.InvariantInfo),
                            }
                        );
                        break;
                    default:
                        continue;
                }
            }

            return facets;
        }

        private static XmlQualifiedName GetTypeNameFromTypeKeyword(KeywordData typeKd, WorkList keywords)
        {
            // This is the case of nillable, so we remove the Null type to be left with the actual type.
            var type = typeKd.GetTypeValue();
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
                    var formatKd = keywords.Pull<FormatKeyword>();
                    var xsdTypeKd = keywords.Pull<XsdTypeKeyword>();
                    XmlQualifiedName typeName = SetType(
                        typeKd.GetTypeValue(),
                        formatKd?.GetFormatString(),
                        xsdTypeKd != null ? (string)xsdTypeKd.Value : null
                    );
                    return typeName;
                case SchemaValueType.Array:
                    var arrayItemsKd = keywords.FirstOrDefault(kd => kd.Handler is ItemsKeyword);
                    var arrayItemSchema = arrayItemsKd.GetSingleSubSchema();
                    var arrayTypeKd = arrayItemSchema.FindKeywordByHandler<TypeKeyword>();
                    var arrayFormatKd = keywords.Pull<FormatKeyword>();
                    var arrayXsdTypeKd = keywords.Pull<XsdTypeKeyword>();
                    XmlQualifiedName arrayType = SetType(
                        arrayTypeKd.GetTypeValue(),
                        arrayFormatKd?.GetFormatString(),
                        arrayXsdTypeKd != null ? (string)arrayXsdTypeKd.Value : null
                    );
                    return arrayType;
                default:
                    throw new ArgumentOutOfRangeException(
                        $"The provided typeKeyword could not be mapped to any SchemaValueType."
                    );
            }
        }

        private void HandleSimpleContentRestriction(XmlSchemaComplexType item, WorkList keywords, JsonPointer path)
        {
            var simpleContent = new XmlSchemaSimpleContent { Parent = item };
            item.ContentModel = simpleContent;

            var restriction = new XmlSchemaSimpleContentRestriction { Parent = simpleContent };
            simpleContent.Content = restriction;

            DeconstructSimpleContentRestriction(
                keywords,
                out var baseTypeSchema,
                out var baseTypeSchemaIndex,
                out var propertiesSchema,
                out var propertiesSchemaIndex
            );

            var propsKd = propertiesSchema.FindKeywordByHandler<PropertiesKeyword>();
            DeconstructSimpleContentRestrictionProperties(
                propsKd,
                out var valuePropertySchema,
                out var attributePropertiesSchemas
            );

            restriction.BaseTypeName = GetTypeNameFromReference(
                baseTypeSchema.FindKeywordByHandler<RefKeyword>().GetRefUri()
            );

            HandleSimpleContentRestrictionValueProperty(
                restriction,
                path,
                valuePropertySchema,
                propertiesSchemaIndex,
                baseTypeSchema,
                baseTypeSchemaIndex
            );
            HandleSimpleContentRestrictionAttributeProperties(
                restriction,
                path,
                attributePropertiesSchemas,
                propertiesSchemaIndex
            );
        }

        private void HandleSimpleContentRestrictionAttributeProperties(
            XmlSchemaSimpleContentRestriction restriction,
            JsonPointer path,
            List<(string Name, JsonSchema JsonSchema)> attributePropertiesSchemas,
            int propertiesSchemaIndex
        )
        {
            foreach (var (name, schema) in attributePropertiesSchemas)
            {
                var attribute = new XmlSchemaAttribute { Parent = restriction, Name = name };

                HandleAttribute(
                    attribute,
                    schema.AsWorkList(),
                    path.Combine(JsonPointer.Parse($"/allOf/[{propertiesSchemaIndex}]/properties/{name}"))
                );
                restriction.Attributes.Add(attribute);
            }
        }

        private void HandleSimpleContentRestrictionValueProperty(
            XmlSchemaSimpleContentRestriction restriction,
            JsonPointer path,
            JsonSchema valuePropertySchema,
            int propertiesSchemaIndex,
            JsonSchema baseTypeSchema,
            int baseTypeSchemaIndex
        )
        {
            if (valuePropertySchema != null)
            {
                if (valuePropertySchema.HasAnyOfKeywords(typeof(TypeKeyword), typeof(AllOfKeyword)))
                {
                    // "value" property contains a simple type
                    var valueType = new XmlSchemaSimpleType { Parent = restriction };
                    restriction.BaseType = valueType;

                    HandleSimpleType(
                        valueType,
                        valuePropertySchema.AsWorkList(),
                        path.Combine(JsonPointer.Parse($"/allOf/[{propertiesSchemaIndex}]/properties/value"))
                    );
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

        private static void DeconstructSimpleContentRestriction(
            WorkList keywords,
            out JsonSchema baseTypeSchema,
            out int baseTypeSchemaIndex,
            out JsonSchema propertiesSchema,
            out int propertiesSchemaIndex
        )
        {
            var allOfKd = keywords.Pull<AllOfKeyword>();
            var allOfSchemas = allOfKd.GetSubSchemas();

            baseTypeSchemaIndex = allOfSchemas
                .Select((schema, idx) => (schema, idx))
                .Where(x => x.schema.HasKeyword<RefKeyword>())
                .Select(x => x.idx)
                .Single();
            propertiesSchemaIndex = allOfSchemas
                .Select((schema, idx) => (schema, idx))
                .Where(x => x.schema.HasKeyword<PropertiesKeyword>())
                .Select(x => x.idx)
                .Single();

            baseTypeSchema = allOfSchemas[baseTypeSchemaIndex];
            propertiesSchema = allOfSchemas[propertiesSchemaIndex];
        }

        private static void DeconstructSimpleContentRestrictionProperties(
            KeywordData propertiesKd,
            out JsonSchema valuePropertySchema,
            out List<(string Name, JsonSchema Schema)> attributeSchemas
        )
        {
            var properties = propertiesKd.GetPropertiesDictionary();
            valuePropertySchema = properties.GetValueOrDefault("value");
            attributeSchemas = properties
                .Where(prop => prop.Key != "value")
                .Select(prop => (name: prop.Key, schema: prop.Value))
                .ToList();
        }

        private void HandleSimpleContentExtension(XmlSchemaComplexType item, WorkList keywords, JsonPointer path)
        {
            var simpleContent = new XmlSchemaSimpleContent { Parent = item };
            item.ContentModel = simpleContent;

            var extension = new XmlSchemaSimpleContentExtension { Parent = simpleContent };
            simpleContent.Content = extension;

            var propertiesKd = keywords.Pull<PropertiesKeyword>();
            var properties = propertiesKd.GetPropertiesDictionary();
            var requiredKd = keywords.Pull<RequiredKeyword>();
            var required =
                requiredKd != null ? (IReadOnlyList<string>)requiredKd.GetRequiredProperties() : Array.Empty<string>();
            var valuePropertySchema = properties["value"];
            var attributes = properties
                .Where(prop => prop.Key != "value")
                .Select(prop => (name: prop.Key, schema: prop.Value))
                .ToList();

            var valuePropertyKeywords = valuePropertySchema.AsWorkList();
            if (valuePropertyKeywords.TryPull<RefKeyword>(out var valueRefKd))
            {
                extension.BaseTypeName = GetTypeNameFromReference(valueRefKd.GetRefUri());
            }
            else
            {
                var valueTypeKd = valuePropertyKeywords.Pull<TypeKeyword>();
                extension.BaseTypeName = GetTypeNameFromTypeKeyword(valueTypeKd, valuePropertyKeywords);
            }

            foreach (var (name, schema) in attributes)
            {
                var attribute = new XmlSchemaAttribute { Parent = extension, Name = name };

                HandleAttribute(attribute, schema.AsWorkList(), path.Combine(JsonPointer.Parse($"/properties/{name}")));
                SetFixed(attribute, schema.FindKeywordByHandler<ConstKeyword>());
                SetDefault(attribute, schema.FindKeywordByHandler<DefaultKeyword>());
                SetRequired(attribute, required.Contains(name));
                extension.Attributes.Add(attribute);
            }
        }

        private void HandleComplexContentExtension(XmlSchemaComplexType item, WorkList keywords, JsonPointer path)
        {
            // <xsd:complexContent>
            var complexContent = new XmlSchemaComplexContent() { Parent = item };

            var allOfKd = keywords.Pull<AllOfKeyword>();
            var subSchemas = allOfKd.GetSubSchemas();
            var refKeywordSchema = subSchemas.First(k => k.GetKeywords().HasKeyword<RefKeyword>());

            // <xsd:extension base="...">
            var extension = new XmlSchemaComplexContentExtension()
            {
                Parent = complexContent,
                BaseTypeName = GetTypeNameFromReference(
                    refKeywordSchema.GetKeywords().FindKeywordByHandler<RefKeyword>().GetRefUri()
                ),
            };

            complexContent.Content = extension;

            // This is a bit a naive and supports only sequence as of now. When implementing choice
            // in issue https://github.com/Altinn/altinn-studio/issues/4803 this needs to be changed.
            // <xsd:sequence>
            var sequence = new XmlSchemaSequence { Parent = extension };

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

                HandlePropertiesKeyword(
                    item,
                    sequence,
                    subSchema.AsWorkList(),
                    path.Combine(JsonPointer.Parse($"/allOf/[{i}]"))
                );
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

        private void HandlePropertiesKeyword(
            XmlSchemaComplexType complexType,
            XmlSchemaSequence sequence,
            WorkList keywords,
            JsonPointer path
        )
        {
            if (!keywords.TryPull<PropertiesKeyword>(out var propertiesKd))
            {
                return;
            }

            var requiredKd = keywords.Pull<RequiredKeyword>();
            var required =
                requiredKd != null ? (IReadOnlyList<string>)requiredKd.GetRequiredProperties() : Array.Empty<string>();

            foreach (var (name, property) in propertiesKd.GetPropertiesDictionary())
            {
                var subItem = ConvertSubschema(path.Combine(JsonPointer.Parse($"/properties/{name}")), property);

                SetName(subItem, name);
                SetRequired(subItem, required.Contains(name));
                SetFixed(subItem, property.GetKeywords().FindKeywordByHandler<ConstKeyword>());
                SetDefault(subItem, property.GetKeywords().FindKeywordByHandler<DefaultKeyword>());
                CarryXsdOccursIfNotSet(subItem, property);

                switch (subItem)
                {
                    case XmlSchemaAttribute attribute:
                        attribute.Parent = complexType;
                        complexType.Attributes.Add(attribute);
                        break;
                    case XmlSchemaElement element:
                        element.Parent = sequence;
                        sequence.Items.Add(element);
                        AddUnhandledAttributes(
                            element,
                            property.GetKeywords().FindKeywordByHandler<XsdUnhandledAttributesKeyword>()
                        );
                        break;
                    default:
                        throw new NotImplementedException();
                }
            }
        }

        /// <summary>
        /// Carries explicitly defined default values for minOccurs and maxOccurs from the original xsd if they were defined.
        /// XsdMinOccursKeyword and XsdMaxOccursKeyword have least priority so they won't be took into consideration if minOccurs and maxOccurs were previously calculated.
        /// </summary>
        private static void CarryXsdOccursIfNotSet(XmlSchemaObject subItem, JsonSchema property)
        {
            if (subItem is not XmlSchemaParticle particle)
            {
                return;
            }

            if (property.TryGetKeyword<XsdMinOccursKeyword>(out var minOccursKd) && particle.MinOccursString is null)
            {
                particle.MinOccurs = (int)minOccursKd.Value;
            }

            if (property.TryGetKeyword<XsdMaxOccursKeyword>(out var maxOccursKd) && particle.MaxOccursString is null)
            {
                particle.MaxOccursString = (string)maxOccursKd.Value;
            }
        }

        private XmlSchemaObject ConvertSubschema(JsonPointer path, JsonSchema schema)
        {
            var compatibleTypes = _metadata.GetCompatibleTypes(path);
            string arrayMinOccurs = null;
            string arrayMaxOccurs = null;

            if (compatibleTypes.Contains(CompatibleXsdType.Array))
            {
                if (schema.TryGetKeyword<MinItemsKeyword>(out var minItemsKd))
                {
                    arrayMinOccurs = minItemsKd.GetLongValue().ToString();
                }

                arrayMaxOccurs = schema.TryGetKeyword<MaxItemsKeyword>(out var maxItemsKd)
                    ? maxItemsKd.GetLongValue().ToString()
                    : "unbounded";
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

        private static void HandleAnyAttributeKeyword(XmlSchemaComplexType complexType, WorkList keywords)
        {
            if (!keywords.TryPull<XsdAnyAttributeKeyword>(out var anyAttributeKd))
            {
                return;
            }

            var anyAttrValue = ((string Id, string Namespace, string ProcessContent))anyAttributeKd.Value;
            XmlSchemaAnyAttribute xmlSchemaAnyAttribute = new XmlSchemaAnyAttribute
            {
                Parent = complexType,
                Id = anyAttrValue.Id,
                Namespace = anyAttrValue.Namespace,
                ProcessContents = Enum.Parse<XmlSchemaContentProcessing>(anyAttrValue.ProcessContent),
            };
            complexType.AnyAttribute = xmlSchemaAnyAttribute;
        }

        private static void HandleAnyAttributeKeyword(
            XmlSchemaComplexContentExtension complexContentExtension,
            WorkList keywords
        )
        {
            if (!keywords.TryPull<XsdAnyAttributeKeyword>(out var anyAttributeKd))
            {
                return;
            }

            var anyAttrValue = ((string Id, string Namespace, string ProcessContent))anyAttributeKd.Value;
            XmlSchemaAnyAttribute xmlSchemaAnyAttribute = new XmlSchemaAnyAttribute
            {
                Parent = complexContentExtension,
                Id = anyAttrValue.Id,
                Namespace = anyAttrValue.Namespace,
                ProcessContents = Enum.Parse<XmlSchemaContentProcessing>(anyAttrValue.ProcessContent),
            };
            complexContentExtension.AnyAttribute = xmlSchemaAnyAttribute;
        }

        private void AddUnhandledAttributes(XmlSchemaObject item, KeywordData xsdUnhandledAttributesKd)
        {
            if (xsdUnhandledAttributesKd == null)
            {
                return;
            }

            if (item is not XmlSchemaAnnotated annotatedItem)
            {
                throw new ArgumentException("Unhandled attributes must be added to an annotated xml schema object.");
            }

            var unhandledAttributes = new List<XmlAttribute>();
            foreach (var (name, value) in (List<(string Name, string Value)>)xsdUnhandledAttributesKd.Value)
            {
                XmlAttribute attribute = CreateAttribute(name, value);
                unhandledAttributes.Add(attribute);
            }

            annotatedItem.UnhandledAttributes = unhandledAttributes.ToArray();
        }

        private void AddUnhandledAttributes(XmlSchema xmlSchema, KeywordData xsdUnhandledAttributesKd)
        {
            if (xsdUnhandledAttributesKd == null)
            {
                return;
            }

            var unhandledAttributes = new List<XmlAttribute>();
            foreach (var (name, value) in (List<(string Name, string Value)>)xsdUnhandledAttributesKd.Value)
            {
                XmlAttribute attribute = CreateAttribute(name, value);
                unhandledAttributes.Add(attribute);
            }

            xmlSchema.UnhandledAttributes = unhandledAttributes.ToArray();
        }

        private void AddUnhandledEnumAttributesToFacet(
            XmlSchemaFacet xmlSchemaFacet,
            IReadOnlyList<NamedKeyValuePairs> unhandledEnumAttributes
        )
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
            // In v9, GetRefUri() returns a fully resolved URI. Extract the fragment part.
            var refString =
                reference.IsAbsoluteUri && !string.IsNullOrEmpty(reference.Fragment)
                    ? reference.Fragment
                    : reference.OriginalString;
            var parts = refString.TrimStart('#', '/').Split('/');
            if (parts.Length != 2 || (parts[0] != "$defs" && parts[0] != "definitions"))
            {
                throw new JsonSchemaConvertException(
                    "Reference uri must point to a definition in $defs/definitions to be used as TypeName"
                );
            }

            return new XmlQualifiedName(parts[1]);
        }

        private static XmlQualifiedName GetTypeNameFromArray(JsonSchema schema, WorkList keywords)
        {
            if (schema.TryGetKeyword<TypeKeyword>(out var typeKd))
            {
                return GetTypeNameFromTypeKeyword(typeKd, keywords);
            }

            if (schema.TryGetKeyword<RefKeyword>(out var refKd))
            {
                return GetTypeNameFromReference(refKd.GetRefUri());
            }

            // Nillable array
            if (schema.TryGetKeyword<OneOfKeyword>(out var oneOfKd))
            {
                var oneOfSchemas = oneOfKd.GetSubSchemas();
                var refKeywordSubSchema = oneOfSchemas.FirstOrDefault(s => s.GetKeywords().HasKeyword<RefKeyword>());
                return GetTypeNameFromReference(refKeywordSubSchema.FindKeywordByHandler<RefKeyword>().GetRefUri());
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

        private static void SetFixed(XmlSchemaObject item, KeywordData constKd)
        {
            if (constKd is null)
            {
                return;
            }

            switch (item)
            {
                case XmlSchemaAttribute attribute:
                    attribute.FixedValue = constKd.RawValue.ToString();
                    break;
            }
        }

        private static void SetDefault(XmlSchemaObject item, KeywordData defaultKd)
        {
            if (defaultKd is null)
            {
                return;
            }

            switch (item)
            {
                case XmlSchemaAttribute attribute:
                    attribute.DefaultValue = defaultKd.RawValue.ToString();
                    break;
            }
        }

        private static XmlQualifiedName SetType(SchemaValueType type, string format, string xsdType)
        {
            // If the type and xsdType are not compatible, calculate the xsdType from the type and format
            if (string.IsNullOrWhiteSpace(xsdType) || !TypeAndXsdTypeAreCompatible(type, xsdType))
            {
                xsdType = GetXsdTypeFromTypeAndFormat(type, format);
            }

            return new XmlQualifiedName(xsdType, KnownXmlNamespaces.XmlSchemaNamespace);
        }

        private static bool TypeAndXsdTypeAreCompatible(SchemaValueType type, string xsdType)
        {
            return type switch
            {
                SchemaValueType.Boolean => xsdType == XmlSchemaTypes.Boolean,
                SchemaValueType.String => XmlSchemaTypes
                    .AllKnownTypes.Except(XmlSchemaTypes.AllNumericTypes)
                    .Except(new List<string> { XmlSchemaTypes.Boolean })
                    .Contains(xsdType),
                SchemaValueType.Number => XmlSchemaTypes.NumericTypesWithFractions.Contains(xsdType),
                SchemaValueType.Integer => XmlSchemaTypes.IntegerDataTypes.Contains(xsdType),
                _ => false,
            };
        }

        private static string GetXsdTypeFromTypeAndFormat(SchemaValueType type, string format)
        {
            return type switch
            {
                SchemaValueType.Boolean => XmlSchemaTypes.Boolean,
                SchemaValueType.String => GetStringTypeFromFormat(format),
                SchemaValueType.Number => XmlSchemaTypes.Double,
                SchemaValueType.Integer => XmlSchemaTypes.Long,
                // Fallback to open string value
                _ => "string",
            };
        }

        private static string GetStringTypeFromFormat(string format)
        {
            return format switch
            {
                "date-time" => XmlSchemaTypes.DateTime,
                "date" => XmlSchemaTypes.Date,
                "time" => XmlSchemaTypes.Time,
                "uri" => XmlSchemaTypes.AnyUri,
                // Fallback to open string value
                _ => XmlSchemaTypes.String,
            };
        }

        private static int GetKeywordSubSchemaIndex<T>(IReadOnlyList<JsonSchema> schemas)
            where T : IKeywordHandler
        {
            return schemas
                .Select((schema, idx) => (schema, idx))
                .Where(x => x.schema.HasKeyword<T>())
                .Select(x => x.idx)
                .Single();
        }

        private static bool IsNumericXmlSchemaType(XmlQualifiedName type)
        {
            if (type.IsEmpty || type.Namespace != KnownXmlNamespaces.XmlSchemaNamespace)
            {
                return false;
            }

            if (XmlSchemaTypes.AllNumericTypes.Contains(type.Name))
            {
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
