using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Json
{
    /// <summary>
    /// placeholder
    /// </summary>
    public class JsonSchemaToXmlSchemaConverter
    {
        private const string XmlSchemaNamespace = "http://www.w3.org/2001/XMLSchema";
        private const string XmlSchemaInstanceNamespace = "http://www.w3.org/2001/XMLSchema-instance";

        private readonly Dictionary<string, string> _namespaces;
        private readonly XmlDocument _xmlFactoryDocument;

        private JsonSchema _jsonSchema;
        private HashSet<string> _groups;
        private HashSet<string> _attributeGroups;

        /// <summary>
        /// Placeholder
        /// </summary>
        public JsonSchemaToXmlSchemaConverter()
        {
            _xmlFactoryDocument = new XmlDocument();
            _namespaces = new Dictionary<string, string>();
        }

        /// <summary>
        /// placeholder
        /// </summary>
        /// <param name="schema">The Json Schema to be converted</param>
        /// <returns>An xml schema</returns>
        public XmlSchema Convert(JsonSchema schema)
        {
            _jsonSchema = schema;
            XmlSchema xsd = new XmlSchema();

            FindGroupAndAttributeGroupElementsInSchema();

            WorkList<IJsonSchemaKeyword> keywords = schema.AsWorkList();

            HandleNamespaces(xsd, keywords.Pull<XsdNamespacesKeyword>(), true);
            HandleSchemaAttributes(xsd, keywords.Pull<XsdSchemaAttributesKeyword>());
            HandleInfo(xsd, keywords.Pull<InfoKeyword>());

            HandleDefinition(xsd, keywords, false, null);
            HandleDefinitions(xsd, keywords.Pull<DefinitionsKeyword>());
            HandleDefs(xsd, keywords.Pull<DefsKeyword>());

            List<IJsonSchemaKeyword> unhandled = keywords.EnumerateUnhandledItems().ToList();
            if (unhandled.Count > 0)
            {
                // throw new Exception($"Not handled keywords{Environment.NewLine}{string.Join(Environment.NewLine, unhandled.Select(kw => kw.Keyword()))}");
            }

            return xsd;
        }

        private void FindGroupAndAttributeGroupElementsInSchema()
        {
            IReadOnlyDictionary<string, JsonSchema> definitions = _jsonSchema.GetKeyword<DefinitionsKeyword>()?.Definitions ?? new Dictionary<string, JsonSchema>();
            IReadOnlyDictionary<string, JsonSchema> defs = _jsonSchema.GetKeyword<DefsKeyword>()?.Definitions ?? new Dictionary<string, JsonSchema>();

            if (definitions.Count == 0 && defs.Count == 0)
            {
                return;
            }

            HashSet<string> potentialGroups = new HashSet<string>();
            HashSet<string> potentialAttributeGroups = new HashSet<string>();

            foreach ((string name, JsonSchema definition) in definitions)
            {
                if (IsPotentialGroup(definition))
                {
                    potentialGroups.Add($"#/definitions/{name}");
                }
                else if (IsPotentialAttributeGroupGroup(definition))
                {
                    potentialAttributeGroups.Add($"#/definitions/{name}");
                }
            }

            foreach ((string name, JsonSchema definition) in defs)
            {
                if (IsPotentialGroup(definition))
                {
                    potentialGroups.Add($"#/$defs/{name}");
                }
                else if (IsPotentialAttributeGroupGroup(definition))
                {
                    potentialAttributeGroups.Add($"#/$defs/{name}");
                }
            }

            RemoveInvalidGroups(_jsonSchema, "#", potentialGroups);
            RemoveInvalidAttributeGroups(_jsonSchema, "#", potentialAttributeGroups);
            foreach ((_, JsonSchema definition) in definitions)
            {
                RemoveInvalidGroups(definition, "#/definitions", potentialGroups);
                RemoveInvalidAttributeGroups(definition, "#/definitions", potentialAttributeGroups);
            }

            foreach ((_, JsonSchema definition) in defs)
            {
                RemoveInvalidGroups(definition, "#/$defs", potentialAttributeGroups);
                RemoveInvalidAttributeGroups(definition, "#/$defs", potentialAttributeGroups);
            }

            _groups = new HashSet<string>(potentialGroups);
            _attributeGroups = new HashSet<string>(potentialAttributeGroups);
        }

        private void RemoveInvalidGroups(JsonSchema schema, string path, HashSet<string> potentialGroups)
        {
            if (IsSimpleType(schema))
            {
                return;
            }

            if (IsSimpleTypeList(schema))
            {
                ItemsKeyword items = schema.GetKeyword<ItemsKeyword>();
                foreach ((JsonSchema itemsSchema, int i) in items.GetSubschemas().Select((itemsSchema, i) => (itemsSchema, i)))
                {
                    if (IsPureReferenceSchema(itemsSchema))
                    {
                        potentialGroups.Remove(itemsSchema.GetKeyword<RefKeyword>().Reference.ToString());
                    }

                    RemoveInvalidGroups(itemsSchema, $"{path}/items/{i}", potentialGroups);
                }

                return;
            }
            
            if (IsPureReferenceSchema(schema) && schema.GetKeyword<XsdAttributeKeyword>()?.Value == true)
            {
                potentialGroups.Remove(schema.GetKeyword<RefKeyword>().Reference.ToString());
                return;
            }

            if (schema.TryGetKeyword(out PropertiesKeyword properties))
            {
                foreach ((string name, JsonSchema propertySchema) in properties.Properties)
                {
                    RemoveInvalidGroups(propertySchema, $"{path}/properties/{name}", potentialGroups);
                }
            }

            if (schema.TryGetKeyword(out IfKeyword ifKeyword))
            {
                RemoveInvalidGroups(ifKeyword.Schema, $"{path}/if", potentialGroups);
            }

            if (schema.TryGetKeyword(out ThenKeyword thenKeyword))
            {
                RemoveInvalidGroups(thenKeyword.Schema, $"{path}/then", potentialGroups);
            }

            if (schema.TryGetKeyword(out ElseKeyword elseKeyword))
            {
                RemoveInvalidGroups(elseKeyword.Schema, $"{path}/else", potentialGroups);
            }

            if (schema.TryGetKeyword(out NotKeyword notKeyword))
            {
                RemoveInvalidGroups(notKeyword.Schema, $"{path}/not", potentialGroups);
            }

            if (schema.TryGetKeyword(out AllOfKeyword allOf))
            {
                if (IsSimpleTypeRestriction(allOf.Schemas) ||
                    IsSimpleContentRestriction(allOf.Schemas) ||
                    IsComplexContentRestriction(allOf.Schemas) ||
                    IsComplexContentExtension(allOf.Schemas))
                {
                    JsonSchema baseSchema = allOf.Schemas[0];
                    if (baseSchema.TryGetKeyword(out RefKeyword refKeyword))
                    {
                        potentialGroups.Remove(refKeyword.Reference.ToString());
                    }

                    for (int i = 1; i < allOf.Schemas.Count; i++)
                    {
                        RemoveInvalidGroups(allOf.Schemas[i], $"{path}/allOf/{i}", potentialGroups);
                    }
                }
                else
                {
                    for (int i = 0; i < allOf.Schemas.Count; i++)
                    {
                        RemoveInvalidGroups(allOf.Schemas[i], $"{path}/allOf/{i}", potentialGroups);
                    }
                }
            }
            else if (schema.TryGetKeyword(out OneOfKeyword oneOf))
            {
                for (int i = 0; i < oneOf.Schemas.Count; i++)
                {
                    RemoveInvalidGroups(allOf.Schemas[i], $"{path}/allOf/{i}", potentialGroups);
                }
            }
            else if (schema.TryGetKeyword(out AnyOfKeyword anyOf))
            {
                for (int i = 0; i < oneOf.Schemas.Count; i++)
                {
                    RemoveInvalidGroups(anyOf.Schemas[i], $"{path}/allOf/{i}", potentialGroups);
                }
            }
        }

        private void RemoveInvalidAttributeGroups(JsonSchema schema, string path, HashSet<string> potentialAttributeGroups)
        {
            if (IsSimpleType(schema))
            {
                return;
            }

            if (IsSimpleTypeList(schema))
            {
                ItemsKeyword items = schema.GetKeyword<ItemsKeyword>();
                foreach ((JsonSchema itemsSchema, int i) in items.GetSubschemas().Select((itemsSchema, i) => (itemsSchema, i)))
                {
                    if (IsPureReferenceSchema(itemsSchema))
                    {
                        potentialAttributeGroups.Remove(itemsSchema.GetKeyword<RefKeyword>().Reference.ToString());
                    }

                    RemoveInvalidAttributeGroups(itemsSchema, $"{path}/items/{i}", potentialAttributeGroups);
                }

                return;
            }

            if (IsPureReferenceSchema(schema) && schema.GetKeyword<XsdAttributeKeyword>()?.Value != true)
            {
                potentialAttributeGroups.Remove(schema.GetKeyword<RefKeyword>().Reference.ToString());
                return;
            }

            if (schema.TryGetKeyword(out PropertiesKeyword properties))
            {
                foreach ((string name, JsonSchema propertySchema) in properties.Properties)
                {
                    RemoveInvalidAttributeGroups(propertySchema, $"{path}/properties/{name}", potentialAttributeGroups);
                }
            }

            if (schema.TryGetKeyword(out IfKeyword ifKeyword))
            {
                RemoveInvalidAttributeGroups(ifKeyword.Schema, $"{path}/if", potentialAttributeGroups);
            }

            if (schema.TryGetKeyword(out ThenKeyword thenKeyword))
            {
                RemoveInvalidAttributeGroups(thenKeyword.Schema, $"{path}/then", potentialAttributeGroups);
            }

            if (schema.TryGetKeyword(out ElseKeyword elseKeyword))
            {
                RemoveInvalidAttributeGroups(elseKeyword.Schema, $"{path}/else", potentialAttributeGroups);
            }

            if (schema.TryGetKeyword(out NotKeyword notKeyword))
            {
                RemoveInvalidAttributeGroups(notKeyword.Schema, $"{path}/not", potentialAttributeGroups);
            }

            if (schema.TryGetKeyword(out AllOfKeyword allOf))
            {
                if (IsSimpleTypeRestriction(allOf.Schemas) ||
                    IsSimpleContentRestriction(allOf.Schemas) ||
                    IsComplexContentRestriction(allOf.Schemas) ||
                    IsComplexContentExtension(allOf.Schemas))
                {
                    JsonSchema baseSchema = allOf.Schemas[0];
                    if (baseSchema.TryGetKeyword(out RefKeyword refKeyword))
                    {
                        potentialAttributeGroups.Remove(refKeyword.Reference.ToString());
                    }

                    for (int i = 1; i < allOf.Schemas.Count; i++)
                    {
                        RemoveInvalidAttributeGroups(allOf.Schemas[i], $"{path}/allOf/{i}", potentialAttributeGroups);
                    }
                }
                else
                {
                    for (int i = 0; i < allOf.Schemas.Count; i++)
                    {
                        RemoveInvalidAttributeGroups(allOf.Schemas[i], $"{path}/allOf/{i}", potentialAttributeGroups);
                    }
                }
            }
            else if (schema.TryGetKeyword(out OneOfKeyword oneOf))
            {
                for (int i = 0; i < oneOf.Schemas.Count; i++)
                {
                    RemoveInvalidAttributeGroups(allOf.Schemas[i], $"{path}/allOf/{i}", potentialAttributeGroups);
                }
            }
            else if (schema.TryGetKeyword(out AnyOfKeyword anyOf))
            {
                for (int i = 0; i < oneOf.Schemas.Count; i++)
                {
                    RemoveInvalidAttributeGroups(anyOf.Schemas[i], $"{path}/allOf/{i}", potentialAttributeGroups);
                }
            }
        }

        private bool IsPotentialGroup(JsonSchema schema)
        {
            if (!IsPurePropertiesSchema(schema))
            {
                return false;
            }

            XsdStructureKeyword structure = null;
            schema = CollapseSingleNestedAllOfs(schema, ref structure);

            foreach ((_, JsonSchema propertySchema) in schema.GetKeyword<PropertiesKeyword>().Properties)
            {
                if (propertySchema.HasKeyword<XsdAttributeKeyword>())
                {
                    return false;
                }
            }

            return true;
        }

        private bool IsPotentialAttributeGroupGroup(JsonSchema schema)
        {
            if (!IsPurePropertiesSchema(schema))
            {
                return false;
            }

            XsdStructureKeyword structure = null;
            schema = CollapseSingleNestedAllOfs(schema, ref structure);

            foreach ((_, JsonSchema propertySchema) in schema.GetKeyword<PropertiesKeyword>().Properties)
            {
                if (!propertySchema.HasKeyword<XsdAttributeKeyword>())
                {
                    return false;
                }
            }

            return true;
        }

        private void HandleDefinition(XmlSchemaObject item, WorkList<IJsonSchemaKeyword> keywords, bool required, XsdStructureKeyword structure)
        {
            if (keywords.TryPull(out XsdStructureKeyword newStructure))
            {
                structure = newStructure;
            }

            HandleAnnotation(item, keywords);

            if (keywords.TryPull(out RefKeyword reference))
            {
                HandleRef(item, reference, keywords);
            }
            else if (keywords.TryPull(out OneOfKeyword oneOf))
            {
                HandleOneOf(item, oneOf, structure);
            }
            else if (keywords.TryPull(out AnyOfKeyword anyOf))
            {
                // throw new NotImplementedException();
            }
            else if (keywords.TryPull(out AllOfKeyword allOf))
            {
                // throw new NotImplementedException();
                HandleAllOf(item, allOf, structure);
            }
            else if (keywords.TryPull(out TypeKeyword type))
            {
                HandleType(item, type, keywords, required, structure);
            }
            else
            {
                HandleObjectDefinition(item, keywords, required, structure);
            }

            ConstKeyword constKeyword = keywords.Pull<ConstKeyword>();
            DefaultKeyword defaultKeyword = keywords.Pull<DefaultKeyword>();

            if (item is XmlSchemaElement element)
            {
                element.FixedValue = constKeyword?.Value.GetString();
                element.DefaultValue = defaultKeyword?.Value.GetString();
            }
            else if (item is XmlSchemaAttribute attribute)
            {
                attribute.FixedValue = constKeyword?.Value.GetString();
                attribute.DefaultValue = defaultKeyword?.Value.GetString();
            }

            if (keywords.TryPull(out XsdAnyAttributeKeyword anyAttributeKeyword) && anyAttributeKeyword.Value)
            {
                XmlSchemaAnyAttribute anyAttribute = new XmlSchemaAnyAttribute
                {
                    Parent = item
                };

                switch (item)
                {
                    case XmlSchemaComplexType x:
                        x.AnyAttribute = anyAttribute;
                        break;
                    default:
                        throw new Exception($"AnyAttribute cannot be added to xml schema object of type {item.GetType().Name}");
                }
            }

            AddUnhandledAttributes(item, keywords);
        }

        private void HandleAnnotation(XmlSchemaObject item, WorkList<IJsonSchemaKeyword> keywords)
        {
            XmlSchemaAnnotated annotated = item as XmlSchemaAnnotated;
            if (annotated == null)
            {
                return;
            }

            bool haveAnnotations = false;
            XmlSchemaAnnotation annotation = new XmlSchemaAnnotation
            {
                Parent = annotated
            };

            if (keywords.TryPull(out CommentKeyword comment))
            {
                XmlDocument doc = new XmlDocument();
                doc.LoadXml($"<root>{comment.Value}</root>");
                XmlElement root = doc.DocumentElement;
                foreach (XmlNode node in root!.ChildNodes)
                {
                    XmlSchemaObject annotationItem;
                    XmlNode[] markup = node.ChildNodes.Cast<XmlNode>().ToArray();

                    switch (node.LocalName.ToUpperInvariant())
                    {
                        case "APPINFO":
                            annotationItem = new XmlSchemaAppInfo
                            {
                                Parent = annotation,
                                Markup = markup
                            };
                            break;
                        case "DOCUMENTATION":
                        default:
                            annotationItem = new XmlSchemaDocumentation
                            {
                                Parent = annotation,
                                Markup = markup
                            };
                            break;
                    }

                    annotation.Items.Add(annotationItem);
                    haveAnnotations = true;
                }
            }

            if (haveAnnotations)
            {
                annotated.Annotation = annotation;
            }
        }

        private void HandleOneOf(XmlSchemaObject item, OneOfKeyword oneOf, XsdStructureKeyword structure)
        {
            if (structure?.Value.ToUpperInvariant() != "CHOICE")
            {
                structure = new XsdStructureKeyword("choice");
            }

            foreach (JsonSchema schema in oneOf.Schemas)
            {
                HandleDefinition(item, schema.AsWorkList(), false, structure);
            }
        }

        private void HandleAllOf(XmlSchemaObject item, AllOfKeyword allOf, XsdStructureKeyword structure)
        {
            if (allOf.Schemas.Count == 1)
            {
                HandleDefinition(item, allOf.Schemas[0].AsWorkList(), false, structure);
                return;
            }

            if (IsSimpleTypeRestriction(allOf.Schemas))
            {
                XmlSchemaSimpleTypeRestriction restriction = new XmlSchemaSimpleTypeRestriction();
                WorkList<IJsonSchemaKeyword> baseTypeKeywords = allOf.Schemas[0].AsWorkList();

                HandleDefinition(restriction, baseTypeKeywords, false, null);
                XmlQualifiedName baseTypeName = FindBaseBuiltinTypeForSimpleType(allOf.Schemas[0]);
                HandleRestrictions(restriction, baseTypeName, allOf.Schemas[1].AsWorkList());

                if (item is XmlSchemaSimpleType simpleType)
                {
                    restriction.Parent = simpleType;
                    simpleType.Content = restriction;
                }
                else if (item is XmlSchemaElement or XmlSchemaAttribute)
                {
                    simpleType = new XmlSchemaSimpleType
                    {
                        Parent = item,
                        Content = restriction
                    };
                    restriction.Parent = simpleType;

                    switch (item)
                    {
                        case XmlSchemaElement x:
                            x.SchemaType = simpleType;
                            break;
                        case XmlSchemaAttribute x:
                            x.SchemaType = simpleType;
                            break;
                    }
                }
                else
                {
                    throw new Exception("simpleType restriction must have simple type as parent");
                }
            }
            else if (IsSimpleContentRestriction(allOf.Schemas))
            {
                JsonSchema baseTypeSchema = allOf.Schemas[0];
                JsonSchema restrictionSchema = allOf.Schemas[1];

                XmlSchemaSimpleContent content = new XmlSchemaSimpleContent
                {
                    Parent = item
                };

                XmlSchemaSimpleContentRestriction restriction = new XmlSchemaSimpleContentRestriction
                {
                    Parent = content
                };
                content.Content = restriction;

                ((XmlSchemaComplexType) item).ContentModel = content;

                HandleDefinition(restriction, baseTypeSchema.AsWorkList(), false, null);

                PropertiesKeyword restrictionProperties = restrictionSchema.GetKeyword<PropertiesKeyword>();
                if (!restrictionProperties.Properties.TryGetValue("value", out JsonSchema baseTypeRestrictionProperty))
                {
                    throw new Exception("SimpleContentRestriction must have a property with the name 'value' for restrictions");
                }

                XmlQualifiedName baseBuiltinType = FindBaseBuiltinTypeForSimpleContentRestriction(baseTypeSchema);

                HandleRestrictions(restriction, baseBuiltinType, baseTypeRestrictionProperty.AsWorkList());

                foreach ((string name, JsonSchema attributeSchema) in restrictionProperties.Properties.Where(prop => prop.Key != "value"))
                {
                    XmlSchemaAttribute attribute = new XmlSchemaAttribute
                    {
                        Name = name
                    };
                    HandleDefinition(attribute, attributeSchema.AsWorkList(), false, null);
                    restriction.Attributes.Add(attribute);
                }
            }
            else if (IsComplexContentRestriction(allOf.Schemas))
            {
                XmlSchemaComplexContent content = new XmlSchemaComplexContent();

                XmlSchemaComplexContentRestriction restriction = new XmlSchemaComplexContentRestriction
                {
                    Parent = content,
                    BaseTypeName = GetTypeFromReference(allOf.Schemas[0].GetKeyword<RefKeyword>().Reference)
                };
                content.Content = restriction;

                foreach (var schema in allOf.Schemas.Skip(1))
                {
                    HandleDefinition(restriction, schema.AsWorkList(), false, structure);
                }

                if (item is XmlSchemaComplexType complexType)
                {
                    content.Parent = complexType;
                    complexType.ContentModel = content;
                }
                else if (item is XmlSchemaElement or XmlSchema)
                {
                    complexType = new XmlSchemaComplexType
                    {
                        Parent = item,
                        ContentModel = content
                    };
                    content.Parent = complexType;

                    switch (item)
                    {
                        case XmlSchemaElement x:
                            x.SchemaType = complexType;
                            break;
                        case XmlSchema x:
                            x.Items.Add(complexType);
                            break;
                    }
                }
                else
                {
                    throw new Exception("complexType must have element or schema as parent");
                }
            }
            else if (IsComplexContentExtension(allOf.Schemas))
            {
                XmlSchemaComplexContent content = new XmlSchemaComplexContent();

                XmlSchemaComplexContentExtension extension = new XmlSchemaComplexContentExtension
                {
                    Parent = content,
                    BaseTypeName = GetTypeFromReference(allOf.Schemas[0].GetKeyword<RefKeyword>().Reference)
                };
                content.Content = extension;

                foreach (var schema in allOf.Schemas.Skip(1))
                {
                    HandleDefinition(extension, schema.AsWorkList(), false, structure);
                }

                if (item is XmlSchemaComplexType complexType)
                {
                    content.Parent = complexType;
                    complexType.ContentModel = content;
                }
                else if (item is XmlSchemaElement or XmlSchema)
                {
                    complexType = new XmlSchemaComplexType
                    {
                        Parent = item,
                        ContentModel = content
                    };
                    content.Parent = complexType;

                    switch (item)
                    {
                        case XmlSchemaElement x:
                            x.SchemaType = complexType;
                            break;
                        case XmlSchema x:
                            x.Items.Add(complexType);
                            break;
                    }
                }
                else
                {
                    throw new Exception("complexType must have element or schema as parent");
                }
            }
            else
            {
                foreach (JsonSchema schema in allOf.Schemas)
                {
                    HandleDefinition(item, schema.AsWorkList(), false, structure);
                }
            }
        }

        private XmlQualifiedName FindBaseBuiltinTypeForSimpleContentRestriction(JsonSchema baseTypeSchema)
        {
            if (IsPureReferenceSchema(baseTypeSchema))
            {
                // Must reference a ComplexType with SimpleContentExtension or SimpleContentRestriction
                baseTypeSchema = FollowReference(baseTypeSchema.GetKeyword<RefKeyword>());
                XsdStructureKeyword structure = null;
                baseTypeSchema = CollapseSingleNestedAllOfs(baseTypeSchema, ref structure);

                if (baseTypeSchema.TryGetKeyword(out AllOfKeyword allOf))
                {
                    if (!IsSimpleContentRestriction(allOf.Schemas))
                    {
                        throw new Exception("Invalid base type of SimpleContentRestriction, must evaluate as SimpleContentExtension or SimpleContentRestriction");
                    }

                    return FindBaseBuiltinTypeForSimpleContentRestriction(allOf.Schemas[0]);
                }

                if (baseTypeSchema.TryGetKeyword(out PropertiesKeyword properties))
                {
                    ComplexTypeContentType contentType = GetComplexTypeContentType(properties.Properties);

                    if (contentType != ComplexTypeContentType.SimpleContentExtensionOrRestriction)
                    {
                        throw new Exception("Invalid base type of SimpleContentRestriction, must evaluate as SimpleContentExtension or SimpleContentRestriction");
                    }

                    return FindBaseBuiltinTypeForSimpleContentExtension(properties.Properties["value"]);
                }
            }

            WorkList<IJsonSchemaKeyword> baseTypeKeywords = baseTypeSchema.AsWorkList();
            if (baseTypeKeywords.TryPull(out TypeKeyword type))
            {
                XmlSchemaSimpleType dummy = new XmlSchemaSimpleType();
                return HandleType(dummy, type, baseTypeKeywords, false, null);
            }

            throw new Exception("The 'value' property must have $ref or type set to be a valid SimpleContentExtension value");
        }

        private XmlQualifiedName FindBaseBuiltinTypeForSimpleContentExtension(JsonSchema baseTypeSchema)
        {
            if (IsPureReferenceSchema(baseTypeSchema))
            {
                // Must reference a ComplexType with SimpleContentExtension, SimpleTypeList or a SimpleType
                baseTypeSchema = FollowReference(baseTypeSchema.GetKeyword<RefKeyword>());
                XsdStructureKeyword structure = null;
                baseTypeSchema = CollapseSingleNestedAllOfs(baseTypeSchema, ref structure);

                if (IsSimpleType(baseTypeSchema))
                {
                    return FindBaseBuiltinTypeForSimpleType(baseTypeSchema);
                }

                if (IsSimpleTypeList(baseTypeSchema))
                {
                    return FindBaseBuiltinTypeForSimpleTypeList(baseTypeSchema);
                }

                if (baseTypeSchema.TryGetKeyword(out PropertiesKeyword properties))
                {
                    ComplexTypeContentType contentType = GetComplexTypeContentType(properties.Properties);

                    if (contentType == ComplexTypeContentType.SimpleContentExtensionOrRestriction)
                    {
                        return FindBaseBuiltinTypeForSimpleContentExtension(properties.Properties["value"]);
                    }
                }

                throw new Exception("Invalid base type of SimpleContentExtension, must evaluate as SimpleContentExtension, SimpleTypeList or a SimpleType");
            }

            WorkList<IJsonSchemaKeyword> baseTypeKeywords = baseTypeSchema.AsWorkList();
            if (baseTypeKeywords.TryPull(out TypeKeyword type))
            {
                XmlSchemaSimpleType dummy = new XmlSchemaSimpleType();
                return HandleType(dummy, type, baseTypeKeywords, false, null);
            }

            throw new Exception("The 'value' property must have $ref or type set to be a valid SimpleContentExtension value");
        }

        private XmlQualifiedName FindBaseBuiltinTypeForSimpleType(JsonSchema baseTypeSchema)
        {
            if (!IsSimpleType(baseTypeSchema))
            {
                throw new ArgumentException("Schema must validate as a SimpleType", nameof(baseTypeSchema));
            }

            WorkList<IJsonSchemaKeyword> keywords = baseTypeSchema.AsWorkList();
            if (keywords.TryPull(out TypeKeyword type))
            {
                XmlSchemaSimpleType dummy = new XmlSchemaSimpleType();
                return HandleType(dummy, type, keywords, false, null);
            }

            if (keywords.TryPull(out AllOfKeyword allOf))
            {
                if (IsPureReferenceSchema(allOf.Schemas[0]))
                {
                    baseTypeSchema = FollowReferences(allOf.Schemas[0].GetKeyword<RefKeyword>());
                }
                else
                {
                    baseTypeSchema = allOf.Schemas[0];
                }

                if (IsSimpleType(allOf.Schemas[0]))
                {
                    return FindBaseBuiltinTypeForSimpleType(baseTypeSchema);
                }

                if (IsSimpleTypeList(allOf.Schemas[0]))
                {
                    return FindBaseBuiltinTypeForSimpleTypeList(baseTypeSchema);
                }
            }

            throw new ArgumentException("Schema must validate as a SimpleType", nameof(baseTypeSchema));
        }

        private XmlQualifiedName FindBaseBuiltinTypeForSimpleTypeList(JsonSchema baseTypeSchema)
        {
            if (!IsSimpleTypeList(baseTypeSchema))
            {
                throw new ArgumentException("Schema must validate as a SimpleTypeList", nameof(baseTypeSchema));
            }

            ItemsKeyword itemsSchema = baseTypeSchema.GetKeyword<ItemsKeyword>();
            if (itemsSchema.ArraySchemas != null)
            {
                throw new Exception("Tuple array items are not supported by Altinn Studio schema converter");
            }

            JsonSchema schema = itemsSchema.SingleSchema;

            if (IsPureReferenceSchema(schema))
            {
                schema = FollowReferences(schema.GetKeyword<RefKeyword>());
            }

            if (IsSimpleType(schema))
            {
                return FindBaseBuiltinTypeForSimpleType(schema);
            }

            if (IsSimpleTypeList(schema))
            {
                return FindBaseBuiltinTypeForSimpleTypeList(itemsSchema.SingleSchema);
            }

            throw new ArgumentException("Schema must validate as a SimpleTypeList", nameof(baseTypeSchema));
        }

        private bool IsSimpleContentRestriction(IReadOnlyList<JsonSchema> schemas)
        {
            if (schemas.Count != 2)
            {
                return false;
            }

            XsdStructureKeyword structure = null;

            JsonSchema baseTypeSchema = CollapseSingleNestedAllOfs(schemas[0], ref structure);
            JsonSchema restrictionsSchema = CollapseSingleNestedAllOfs(schemas[1], ref structure);

            if (IsPureReferenceSchema(baseTypeSchema))
            {
                baseTypeSchema = FollowReferences(baseTypeSchema.GetKeyword<RefKeyword>());
                baseTypeSchema = CollapseSingleNestedAllOfs(baseTypeSchema, ref structure);
            }

            if (baseTypeSchema.TryGetKeyword(out PropertiesKeyword baseTypeProperties))
            {
                // Look for SimpleContentExtension
                ComplexTypeContentType baseTypeContentType = GetComplexTypeContentType(baseTypeProperties.Properties);
                if (baseTypeContentType != ComplexTypeContentType.SimpleContentExtensionOrRestriction)
                {
                    return false;
                }
            }
            else if (baseTypeSchema.TryGetKeyword(out AllOfKeyword baseTypeAllOf))
            {
                // Look for SimpleContentRestriction
                if (!IsSimpleContentRestriction(baseTypeAllOf.Schemas))
                {
                    return false;
                }
            }
            else
            {
                return false;
            }

            if (!restrictionsSchema.TryGetKeyword(out PropertiesKeyword properties))
            {
                return false;
            }

            ComplexTypeContentType contentType = GetComplexTypeContentType(properties.Properties);
            if (contentType == ComplexTypeContentType.ComplexContent)
            {
                return false;
            }

            return true;
        }

        private void HandleRestrictions(XmlSchemaAnnotated item, XmlQualifiedName type, WorkList<IJsonSchemaKeyword> keywords)
        {
            if (item is not (XmlSchemaSimpleTypeRestriction or XmlSchemaSimpleContentRestriction))
            {
                throw new ArgumentException("Argument must be one of the XmlSchemaSimpleTypeRestriction or XmlSchemaSimpleContentRestriction", nameof(item));
            }

            List<string> comments = new List<string>();

            foreach (IJsonSchemaKeyword keyword in keywords.EnumerateUnhandledItems())
            {
                switch (keyword)
                {
                    case MaxLengthKeyword maxLength:
                        {
                            string value = maxLength.Value.ToString();
                            if (IsNumericXmlSchemaType(type))
                            {
                                AddRestrictionFacet(item, new XmlSchemaTotalDigitsFacet { Value = value });
                            }
                            else
                            {
                                MinLengthKeyword minLength = keywords.GetKeyword<MinLengthKeyword>();
                                if (minLength?.Value == maxLength.Value)
                                {
                                    AddRestrictionFacet(item, new XmlSchemaLengthFacet { Value = value });
                                    keywords.Pull<MinLengthKeyword>();
                                }
                                else
                                {
                                    AddRestrictionFacet(item, new XmlSchemaMaxLengthFacet { Value = value });
                                }
                            }
                        }

                        break;
                    case MinLengthKeyword minLength:
                        {
                            string value = minLength.Value.ToString();
                            MaxLengthKeyword maxLength = keywords.GetKeyword<MaxLengthKeyword>();
                            if (maxLength?.Value == minLength.Value)
                            {
                                AddRestrictionFacet(item, new XmlSchemaLengthFacet { Value = value });
                                keywords.Pull<MaxLengthKeyword>();
                            }
                            else
                            {
                                AddRestrictionFacet(item, new XmlSchemaMinLengthFacet { Value = value });
                            }
                        }

                        break;
                    case EnumKeyword enumKeyword:
                        foreach (JsonElement value in enumKeyword.Values)
                        {
                            AddRestrictionFacet(item, new XmlSchemaEnumerationFacet { Value = value.GetString() });
                        }

                        break;
                    case PatternKeyword pattern:
                        AddRestrictionFacet(item, new XmlSchemaPatternFacet { Value = pattern.Value.ToString() });
                        break;
                    case MaximumKeyword maximum:
                        AddRestrictionFacet(item, new XmlSchemaMaxInclusiveFacet { Value = maximum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case MinimumKeyword minimum:
                        AddRestrictionFacet(item, new XmlSchemaMinInclusiveFacet { Value = minimum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case ExclusiveMaximumKeyword maximum:
                        AddRestrictionFacet(item, new XmlSchemaMaxExclusiveFacet { Value = maximum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case ExclusiveMinimumKeyword minimum:
                        AddRestrictionFacet(item, new XmlSchemaMinExclusiveFacet { Value = minimum.Value.ToString(NumberFormatInfo.InvariantInfo) });
                        break;
                    case MultipleOfKeyword multipleOf:
                        string fractionDigits = GetFractionDigitsFromMultipleOf(multipleOf.Value);
                        if (fractionDigits == null)
                        {
                            comments.Add($"Could not find fraction digits from multipleOf '{multipleOf.Value}'");
                        }
                        else
                        {
                            AddRestrictionFacet(item, new XmlSchemaFractionDigitsFacet() { Value = fractionDigits });
                        }
                            
                        break;
                    default:
                        throw new Exception($"Unknown restriction keyword '{keyword.Keyword()}'");
                }
            }

            if (comments.Count > 0)
            {
                XmlSchemaDocumentation documentation = new XmlSchemaDocumentation
                {
                    Markup = comments.Select(comment => (XmlNode)_xmlFactoryDocument.CreateTextNode(comment)).ToArray()
                };

                if (item.Annotation == null)
                {
                    XmlSchemaAnnotation annotation = new XmlSchemaAnnotation
                    {
                        Parent = item
                    };
                    item.Annotation = annotation;
                }

                item.Annotation.Items.Add(documentation);
            }

            void AddRestrictionFacet(XmlSchemaObject item, XmlSchemaFacet facet)
            {
                facet.Parent = item;

                switch (item)
                {
                    case XmlSchemaSimpleTypeRestriction x:
                        x.Facets.Add(facet);
                        break;
                    case XmlSchemaSimpleContentRestriction x:
                        x.Facets.Add(facet);
                        break;
                }
            }
        }

        private bool IsNumericXmlSchemaType(XmlQualifiedName type)
        {
            if (type.IsEmpty || type.Namespace != XmlSchemaNamespace)
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

        private string GetFractionDigitsFromMultipleOf(decimal value)
        {
            int digits = 0;

            while (value < 1)
            {
                value *= 10;
                digits++;
            }

            if (value == 1)
            {
                return digits.ToString();
            } 

            return null;
        }

        private bool IsSimpleTypeRestriction(IReadOnlyList<JsonSchema> schemas)
        {
            if (schemas.Count != 2)
            {
                return false;
            }

            if (!IsPureRestrictionsSchema(schemas[1]))
            {
                return false;
            }

            if (IsNonListTypeSchema(schemas[0]) || IsSimpleTypeList(schemas[0]))
            {
                return true;
            }

            if (IsPureReferenceSchema(schemas[0]))
            {
                JsonSchema baseTypeSchema = FollowReferences(schemas[0].GetKeyword<RefKeyword>());
                return IsNonListTypeSchema(baseTypeSchema) || IsSimpleTypeList(baseTypeSchema);
            }

            return false;
        }

        private bool IsComplexContentRestriction(IReadOnlyList<JsonSchema> schemas)
        {
            if (schemas.Count < 2)
            {
                return false;
            }

            XsdStructureKeyword structure = null;

            JsonSchema baseTypeSchema = CollapseSingleNestedAllOfs(schemas[0], ref structure);
            JsonSchema[] definitionSchemas = schemas.Skip(1).Select(definition => CollapseSingleNestedAllOfs(definition, ref structure)).ToArray();

            if (!IsPureReferenceSchema(baseTypeSchema))
            {
                return false;
            }

            if (!definitionSchemas.All(IsPurePropertiesSchema))
            {
                return false;
            }

            baseTypeSchema = FollowReferences(baseTypeSchema.GetKeyword<RefKeyword>());
            baseTypeSchema = CollapseSingleNestedAllOfs(baseTypeSchema, ref structure);
            Dictionary<string, JsonSchema> baseTypeProperties = FindAllProperties(baseTypeSchema);

            foreach ((string propertyName, JsonSchema propertySchema) in definitionSchemas.SelectMany(definitionSchema => definitionSchema.GetKeyword<PropertiesKeyword>().Properties))
            {
                if (!baseTypeProperties.Remove(propertyName, out JsonSchema baseTypeProperty))
                {
                    return false;
                }

                bool propertyIsAttribute = propertySchema.HasKeyword<XsdAttributeKeyword>();
                bool baseTypePropertyIsAttribute = baseTypeProperty.HasKeyword<XsdAttributeKeyword>();

                if (propertyIsAttribute != baseTypePropertyIsAttribute)
                {
                    return false;
                }
            }

            return baseTypeProperties.Count == 0;
        }

        /// <summary>
        /// Finds all first level properties from this schema and referenced schemas
        /// </summary>
        private Dictionary<string, JsonSchema> FindAllProperties(JsonSchema schema)
        {
            XsdStructureKeyword structure = null;
            schema = CollapseSingleNestedAllOfs(schema, ref structure);

            if (schema.TryGetKeyword(out PropertiesKeyword propertiesKeyword))
            {
                return new Dictionary<string, JsonSchema>(propertiesKeyword.Properties);
            }

            IEnumerable<KeyValuePair<string, JsonSchema>> properties = Enumerable.Empty<KeyValuePair<string, JsonSchema>>();

            if (schema.TryGetKeyword(out AllOfKeyword allOfKeyword))
            {
                foreach (JsonSchema definitionSchema in allOfKeyword.Schemas.Select(definition => CollapseSingleNestedAllOfs(definition, ref structure)))
                {
                    if (IsPureReferenceSchema(definitionSchema))
                    {
                        JsonSchema definitionSchemaSource = FollowReferences(definitionSchema.GetKeyword<RefKeyword>());
                        definitionSchemaSource = CollapseSingleNestedAllOfs(definitionSchemaSource, ref structure);
                        properties = properties.Concat(FindAllProperties(definitionSchemaSource));
                    }

                    if (definitionSchema.TryGetKeyword(out propertiesKeyword))
                    {
                        properties = properties.Concat(propertiesKeyword.Properties);
                    }
                }
            }

            // "select distinct by key" requires IEqualityComparer, this does the same job with only delegates
            return properties
                .GroupBy(prop => prop.Key)
                .Select(g => g.First())
                .ToDictionary(prop => prop.Key, prop => prop.Value);
        }

        /// <summary>
        /// This will also return true for schemas that validate as ComplexContentRestriction, so check for that first
        /// </summary>
        private bool IsComplexContentExtension(IReadOnlyList<JsonSchema> schemas)
        {
            if (schemas.Count < 2)
            {
                return false;
            }

            if (!IsPureReferenceSchema(schemas[0]))
            {
                return false;
            }

            if (schemas.Skip(1).All(IsPurePropertiesSchema))
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Checks if this is a simple type schema, arrays are not counted as simple in this context
        /// </summary>
        private bool IsNonListTypeSchema(JsonSchema schema)
        {
            XsdStructureKeyword structure = null;
            schema = CollapseSingleNestedAllOfs(schema, ref structure);

            return schema.HasKeyword<TypeKeyword>(keyword =>
                keyword.Type != SchemaValueType.Null &&
                keyword.Type != SchemaValueType.Object &&
                keyword.Type != SchemaValueType.Array);
        }

        private bool IsPureRestrictionsSchema(JsonSchema schema)
        {
            XsdStructureKeyword structure = null;
            schema = CollapseSingleNestedAllOfs(schema, ref structure);

            return schema?.Keywords?.All(kw =>
                    kw is CommentKeyword
                        or DescriptionKeyword
                        or DeprecatedKeyword
                        or ExamplesKeyword
                        or EnumKeyword
                        or MultipleOfKeyword
                        or MaxLengthKeyword
                        or MinLengthKeyword
                        or MaximumKeyword
                        or MinimumKeyword
                        or ExclusiveMaximumKeyword
                        or ExclusiveMinimumKeyword
                        or PatternKeyword) ?? false;
        }
        
        private bool IsPurePropertiesSchema(JsonSchema schema)
        {
            XsdStructureKeyword structure = null;
            schema = CollapseSingleNestedAllOfs(schema, ref structure);

            IReadOnlyCollection<IJsonSchemaKeyword> keywords = schema.Keywords ?? throw new ArgumentNullException($"{nameof(schema)}.{nameof(schema.Keywords)}");

            if (!keywords.AnyOf<PropertiesKeyword>())
            {
                return false;
            }

            if (keywords.AnyOf<AllOfKeyword, OneOfKeyword, AnyOfKeyword, NotKeyword, IfKeyword, ElseKeyword, ThenKeyword>())
            {
                // False if one of the structure keywords are present
                return false;
            }

            if (keywords.TryGetKeyword(out TypeKeyword type) && type.Type is not (SchemaValueType.Null or SchemaValueType.Object))
            {
                return false;
            }

            return true;
        }

        private bool IsPureReferenceSchema(JsonSchema schema)
        {
            XsdStructureKeyword structure = null;
            schema = CollapseSingleNestedAllOfs(schema, ref structure);

            IReadOnlyCollection<IJsonSchemaKeyword> keywords = schema.Keywords ?? throw new ArgumentNullException($"{nameof(schema)}.{nameof(schema.Keywords)}");

            if (keywords.AnyOf<RefKeyword>())
            {
                // $ref excludes all other practical forms of sub schema
                return true;
            }

            return false;
        }

        private void AddUnhandledAttributes(XmlSchemaObject item, WorkList<IJsonSchemaKeyword> keywords)
        {
            XsdUnhandledAttributesKeyword unhandledAttributesKeyword = keywords.Pull<XsdUnhandledAttributesKeyword>();
            if (unhandledAttributesKeyword != null)
            {
                XmlSchemaAnnotated annotatedItem = item as XmlSchemaAnnotated;
                if (annotatedItem == null)
                {
                    throw new Exception("Unhandled attributes must be added to an annotated xml schema object");
                }

                List<XmlAttribute> unhandledAttributes = new List<XmlAttribute>();

                foreach (var (name, value) in unhandledAttributesKeyword.Properties)
                {
                    string prefix = null, localName, ns = null;
                    string[] nameParts = name.Split(':', 2);
                    if (nameParts.Length == 2)
                    {
                        prefix = nameParts[0];
                        localName = nameParts[1];
                        ns = _namespaces[prefix];
                    }
                    else
                    {
                        localName = name;
                    }

                    XmlAttribute attribute = _xmlFactoryDocument.CreateAttribute(prefix, localName, ns);
                    attribute.Value = value;
                    unhandledAttributes.Add(attribute);
                }

                annotatedItem.UnhandledAttributes = unhandledAttributes.ToArray();
            }
        }

        /// <summary>
        /// Handle a typed schema
        /// </summary>
        /// <returns>The base type name for the typed schema, for object/complex types this returns <code>null</code></returns>
        private XmlQualifiedName HandleType(XmlSchemaObject item, TypeKeyword type, WorkList<IJsonSchemaKeyword> keywords, bool required, XsdStructureKeyword structure)
        {
            switch (type.Type)
            {
                case SchemaValueType.Null:
                case SchemaValueType.Object:
                    HandleObjectDefinition(item, keywords, required, structure);
                    return null;
                case SchemaValueType.Array:
                    return HandleArrayType(item, keywords, required, structure);
                case SchemaValueType.Boolean:
                case SchemaValueType.String:
                case SchemaValueType.Number:
                case SchemaValueType.Integer:
                    XmlQualifiedName typeName = SetType(item, type.Type, keywords.Pull<FormatKeyword>()?.Value, keywords.Pull<XsdTypeKeyword>()?.Value);
                    SetRequired(item, required);
                    return typeName;
                default:
                    throw new ArgumentOutOfRangeException();
            }
        }

        private static void SetRequired(XmlSchemaObject item, bool required)
        {
            switch (item)
            {
                case XmlSchemaElement element:
                    element.MinOccursString = required ? null : "0";
                    break;
                case XmlSchemaAttribute attribute:
                    attribute.Use = required ? XmlSchemaUse.Required : XmlSchemaUse.None;
                    break;
            }

        }

        private static XmlQualifiedName SetType(XmlSchemaObject item, SchemaValueType type, Format format, string xsdType)
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

            switch (item)
            {
                case XmlSchemaAttribute x:
                    x.SchemaTypeName = new XmlQualifiedName(xsdType, XmlSchemaNamespace);
                    return x.SchemaTypeName;
                case XmlSchemaElement x:
                    x.SchemaTypeName = new XmlQualifiedName(xsdType, XmlSchemaNamespace);
                    return x.SchemaTypeName;
                case XmlSchemaSimpleType simpleType:
                    {
                        if (simpleType.Content == null)
                        {
                            simpleType.Content = new XmlSchemaSimpleTypeRestriction
                            {
                                Parent = simpleType
                            };
                        }

                        XmlSchemaSimpleTypeContent contentItem = simpleType.Content;

                        switch (contentItem)
                        {
                            case XmlSchemaSimpleTypeList x:
                                x.ItemTypeName = new XmlQualifiedName(xsdType, XmlSchemaNamespace);
                                return x.ItemTypeName;
                            case XmlSchemaSimpleTypeRestriction x:
                                x.BaseTypeName = new XmlQualifiedName(xsdType, XmlSchemaNamespace);
                                return x.BaseTypeName;
                            default:
                                throw new IndexOutOfRangeException("SimpleType content item does not have a type");
                        }
                    }

                case XmlSchemaSimpleTypeRestriction x:
                    x.BaseTypeName = new XmlQualifiedName(xsdType, XmlSchemaNamespace);
                    return x.BaseTypeName;
                case XmlSchemaSimpleContentExtension x:
                    x.BaseTypeName = new XmlQualifiedName(xsdType, XmlSchemaNamespace);
                    return x.BaseTypeName;
                default:
                    throw new IndexOutOfRangeException("Item does not have a type");
            }
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

        private XmlQualifiedName HandleArrayType(XmlSchemaObject item, WorkList<IJsonSchemaKeyword> keywords, bool required, XsdStructureKeyword structure)
        {
            ItemsKeyword items = keywords.Pull<ItemsKeyword>();
            if (items == null)
            {
                throw new InvalidOperationException("Schema definition with type 'array' requires an 'items' keyword");
            }

            if (items.ArraySchemas != null && items.ArraySchemas.Count != 1)
            {
                throw new InvalidOperationException("Altinn studio does not support tuple validation of arrays");
            }

            JsonSchema itemsSchema = items.SingleSchema ?? items.ArraySchemas?[0];
            if (itemsSchema == null)
            {
                throw new InvalidOperationException("'items' keyword is missing a definition");
            }

            WorkList<IJsonSchemaKeyword> itemsKeywords = itemsSchema.AsWorkList();
            return HandleType(item, itemsKeywords.Pull<TypeKeyword>(), itemsKeywords, false, structure);
        }

        private void HandleObjectDefinition(XmlSchemaObject item, WorkList<IJsonSchemaKeyword> keywords, bool b, XsdStructureKeyword structure)
        {
            List<XmlSchemaObject> items = new List<XmlSchemaObject>();
            ComplexTypeContentType contentType = ComplexTypeContentType.ComplexContent;
            JsonSchema baseTypeSchema = null;

            if (keywords.TryPull(out PropertiesKeyword properties))
            {
                ISet<string> required = keywords.Pull<RequiredKeyword>()?.Properties.ToHashSet() ?? new HashSet<string>();

                contentType = GetComplexTypeContentType(properties.Properties);

                foreach (var (name, value) in properties.Properties.Skip(contentType == ComplexTypeContentType.ComplexContent ? 0 : 1))
                {
                    XmlSchemaObject propertyValue = HandleProperty(name, value, required.Contains(name), structure);
                    items.Add(propertyValue);
                }

                if (contentType == ComplexTypeContentType.SimpleContentExtensionOrRestriction)
                {
                    baseTypeSchema = properties.Properties["value"];
                }
            }

            XmlSchemaObject elementContainer = GetElementContainer(item);
            bool addElementContainer = false;
            if (structure != null)
            {
                switch (structure.Value.ToUpperInvariant())
                {
                    case "ALL":
                        if (elementContainer is not XmlSchemaAll)
                        {
                            elementContainer = new XmlSchemaAll();
                            addElementContainer = true;
                        }

                        break;
                    case "SEQUENCE":
                        if (elementContainer is not XmlSchemaSequence)
                        {
                            elementContainer = new XmlSchemaSequence();
                            addElementContainer = true;
                        }

                        break;
                    case "CHOICE":
                        if (elementContainer is not XmlSchemaChoice)
                        {
                            elementContainer = new XmlSchemaChoice();
                            addElementContainer = true;
                        }

                        break;
                    default:
                        throw new Exception("Unknown structure type");
                }
            }

            XmlSchemaObject typeDefinition;

            switch (item)
            {
                case XmlSchema:
                    typeDefinition = item;

                    // elementContainer = item;
                    break;
                case XmlSchemaComplexType x:
                    typeDefinition = item;
                    if (elementContainer == null)
                    {
                        switch (contentType)
                        {
                            case ComplexTypeContentType.ComplexContent:
                                elementContainer = new XmlSchemaAll();
                                addElementContainer = true;
                                break;
                            case ComplexTypeContentType.SimpleContentExtensionOrRestriction:
                                XmlSchemaSimpleContent content = new XmlSchemaSimpleContent
                                {
                                    Parent = typeDefinition
                                };
                                XmlSchemaSimpleContentExtension extension = new XmlSchemaSimpleContentExtension
                                {
                                    Parent = content
                                };
                                content.Content = extension;
                                typeDefinition = content;

                                x.ContentModel = content;
                                elementContainer = extension;
                                break;
                            default:
                                throw new Exception("Unknown content type for complex type");
                        }

                    }

                    if (addElementContainer)
                    {
                        elementContainer.Parent = typeDefinition;
                        x.Particle = (XmlSchemaParticle)elementContainer;
                    }

                    break;
                case XmlSchemaComplexContentExtension x:
                    typeDefinition = item;
                    if (elementContainer == null)
                    {
                        elementContainer = new XmlSchemaAll();
                        addElementContainer = true;
                    }

                    if (addElementContainer)
                    {
                        elementContainer.Parent = typeDefinition;
                        x.Particle = (XmlSchemaParticle)elementContainer;
                    }

                    break;
                case XmlSchemaComplexContentRestriction x:
                    typeDefinition = item;
                    if (elementContainer == null)
                    {
                        elementContainer = new XmlSchemaAll();
                        addElementContainer = true;
                    }

                    if (addElementContainer)
                    {
                        elementContainer.Parent = typeDefinition;
                        x.Particle = (XmlSchemaParticle)elementContainer;
                    }

                    break;
                case XmlSchemaElement x:
                    if (elementContainer == null)
                    {
                        elementContainer = new XmlSchemaAll();
                        addElementContainer = true;
                    }

                    if (addElementContainer)
                    {
                        typeDefinition = new XmlSchemaComplexType
                        {
                            Parent = item,
                            Particle = (XmlSchemaParticle)elementContainer
                        };
                        elementContainer.Parent = typeDefinition;
                        x.SchemaType = (XmlSchemaType) typeDefinition;
                    }
                    else
                    {
                        typeDefinition = elementContainer.Parent;
                    }

                    break;
                default:
                    throw new Exception("Unknown type definition for element");
            }

            if (contentType == ComplexTypeContentType.SimpleContentExtensionOrRestriction)
            {
                HandleDefinition(elementContainer, baseTypeSchema.AsWorkList(), false, null);
            }

            foreach (XmlSchemaObject property in items)
            {
                switch (contentType)
                {
                    case ComplexTypeContentType.ComplexContent:
                        AddElementOrAttribute(property is XmlSchemaElement ? elementContainer : typeDefinition, property);
                        break;
                    case ComplexTypeContentType.SimpleContentExtensionOrRestriction:
                        AddElementOrAttribute(elementContainer, property);
                        break;
                    default:
                        throw new Exception("Unknown content type for complex type");
                }
            }

            if (keywords.TryPull(out XsdTypeKeyword xsdType))
            {
                if (xsdType.Value.ToUpperInvariant() != "#ANY")
                {
                    throw new Exception($"Unexpected @xsdType keyword value, expected #any found '{xsdType.Value}'");
                }

                ((XmlSchemaGroupBase) elementContainer).Items.Add(new XmlSchemaAny { Parent = elementContainer });
            }

            if (contentType == ComplexTypeContentType.ComplexContent)
            {
                // Remove empty element container from the item
                if (elementContainer != item && !HasItems(elementContainer))
                {
                    if (elementContainer.Parent != null)
                    {
                        switch (elementContainer.Parent)
                        {
                            case XmlSchemaComplexType x:
                                x.Particle = null;
                                break;
                            case XmlSchemaComplexContentRestriction x:
                                x.Particle = null;
                                break;
                            case XmlSchemaComplexContentExtension x:
                                x.Particle = null;
                                break;
                            default:
                                throw new Exception($"Parent element '{elementContainer.Parent.GetType().Name}' does not have a particle");
                        }
                    }

                    elementContainer.Parent = null;
                }
            }
        }

        private ComplexTypeContentType GetComplexTypeContentType(IReadOnlyDictionary<string, JsonSchema> properties)
        {
            if (properties.Count == 0)
            {
                return ComplexTypeContentType.ComplexContent;
            }

            KeyValuePair<string, JsonSchema>[] items = properties.ToArray();

            var firstItem = items[0];

            if (firstItem.Key != "value")
            {
                return ComplexTypeContentType.ComplexContent;
            }

            if (firstItem.Value.HasKeyword<XsdAttributeKeyword>())
            {
                return ComplexTypeContentType.ComplexContent;
            }

            if (items.Length == 1)
            {
                return ComplexTypeContentType.SimpleContentExtensionOrRestriction;
            }

            KeyValuePair<string, JsonSchema>[] restItems = items.Skip(1).ToArray();

            if (!restItems.All(item => item.Value.HasKeyword<XsdAttributeKeyword>()))
            {
                return ComplexTypeContentType.ComplexContent;
            }

            JsonSchema baseType = firstItem.Value;
            if (baseType.TryGetKeyword(out RefKeyword refKeyword))
            {
                baseType = FollowReferences(refKeyword);
                if (!IsNonListTypeSchema(baseType) && !IsSimpleTypeList(baseType))
                {
                    return ComplexTypeContentType.ComplexContent;
                }
            }

            // TODO: Compare all base type attributes to confirm SimpleContentRestriction
            return ComplexTypeContentType.SimpleContentExtensionOrRestriction;
        }

        private JsonSchema FollowReferences(RefKeyword refKeyword)
        {
            JsonSchema schema;
            do
            {
                schema = FollowReference(refKeyword);
                XsdStructureKeyword structure = null;
                schema = CollapseSingleNestedAllOfs(schema, ref structure);
            }
            while (IsPureReferenceSchema(schema));

            return schema;
        }

        private JsonSchema FollowReference(RefKeyword refKeyword)
        {
            JsonPointer pointer = JsonPointer.Parse(refKeyword.Reference.ToString());
            IRefResolvable schemaSegment = _jsonSchema;
            foreach (PointerSegment segment in pointer.Segments)
            {
                schemaSegment = schemaSegment.ResolvePointerSegment(segment.Value);
                if (schemaSegment == null)
                {
                    return null;
                }
            }

            return schemaSegment as JsonSchema;
        }

        private XmlSchemaObject GetElementContainer(XmlSchemaObject item)
        {
            while (true)
            {
                switch (item)
                {
                    case XmlSchema:
                        return item;
                    case XmlSchemaComplexType x:
                        return x.Particle;
                    case XmlSchemaComplexContentExtension:
                        return item;
                    case XmlSchemaComplexContentRestriction:
                        return item;
                    case XmlSchemaElement x:
                        item = x.SchemaType;
                        continue;
                }

                break;
            }

            return null;
        }

        private static bool HasItems(XmlSchemaObject item)
        {
            switch (item)
            {
                case XmlSchema x:
                    return x.Items.Count > 0;
                case XmlSchemaGroupBase x:
                    return x.Items.Count > 0;
                default:
                    throw new ArgumentException($"Schema object of type {item.GetType().Name} cannot have child items");
            }
        }

        private XmlSchemaObject HandleProperty(string name, JsonSchema value, bool required, XsdStructureKeyword structure)
        {
            value = CollapseSingleNestedAllOfs(value, ref structure);

            WorkList<IJsonSchemaKeyword> keywords = value.AsWorkList();
            bool isAttribute = keywords.Pull<XsdAttributeKeyword>()?.Value == true;

            XmlSchemaObject valueItem = isAttribute ?
                new XmlSchemaAttribute { Name = name } :
                new XmlSchemaElement { Name = name };

            HandleDefinition(valueItem, keywords, required, structure);

            return valueItem;
        }

        private static void AddElementOrAttribute(XmlSchemaObject item, XmlSchemaObject valueItem)
        {
            if (valueItem is XmlSchemaElement element)
            {
                switch (item)
                {
                    case XmlSchema x:
                        x.Items.Add(element);
                        valueItem.Parent = x;
                        break;
                    case XmlSchemaSequence x:
                        x.Items.Add(element);
                        valueItem.Parent = x;
                        break;
                    case XmlSchemaAll x:
                        x.Items.Add(element);
                        valueItem.Parent = x;
                        break;
                    case XmlSchemaChoice x:
                        x.Items.Add(element);
                        valueItem.Parent = x;
                        break;
                    default:
                        throw new ArgumentException($"Invalid container for element '{item.GetType().Name}'", nameof(item));
                }
            }
            else if (valueItem is XmlSchemaAttribute attribute)
            {
                switch (item)
                {
                    case XmlSchema x:
                        x.Items.Add(attribute);
                        valueItem.Parent = x;
                        break;
                    case XmlSchemaComplexType x:
                        x.Attributes.Add(attribute);
                        valueItem.Parent = x;
                        break;
                    case XmlSchemaComplexContentExtension x:
                        x.Attributes.Add(attribute);
                        valueItem.Parent = x;
                        break;
                    case XmlSchemaComplexContentRestriction x:
                        x.Attributes.Add(attribute);
                        valueItem.Parent = x;
                        break;
                    case XmlSchemaSimpleContentExtension x:
                        x.Attributes.Add(attribute);
                        valueItem.Parent = x;
                        break;
                    case XmlSchemaSimpleContentRestriction x:
                        x.Attributes.Add(attribute);
                        valueItem.Parent = x;
                        break;
                    default:
                        throw new ArgumentException($"Invalid container for attribute '{item.GetType().Name}'", nameof(item));
                }
            }
        }

        private void HandleDefinitions(XmlSchema xsd, DefinitionsKeyword definitions)
        {
            if (definitions == null)
            {
                return;
            }

            HandleDefinitions(xsd, "#/definitions", definitions.Definitions);
        }

        private void HandleDefs(XmlSchema xsd, DefsKeyword defs)
        {
            if (defs == null)
            {
                return;
            }

            HandleDefinitions(xsd, "#/$defs", defs.Definitions);
        }

        private void HandleDefinitions(XmlSchema xsd, string path, IReadOnlyDictionary<string, JsonSchema> definitions)
        {
            foreach ((string name, JsonSchema definition) in definitions)
            {
                path = $"{path}/{name}";
                XmlSchemaObject item = GetXmlSchemaItem(name, path, definition);
                HandleDefinition(item, definition.AsWorkList(), false, null);
                xsd.Items.Add(item);
            }
        }

        private XmlSchemaObject GetXmlSchemaItem(string name, string path, JsonSchema definition)
        {
            if (_groups.Contains(path))
            {
                return new XmlSchemaGroup
                {
                    Name = name
                };
            }

            if (_attributeGroups.Contains(path))
            {
                return new XmlSchemaAttributeGroup()
                {
                    Name = name
                };
            }

            XsdStructureKeyword structure = null;
            definition = CollapseSingleNestedAllOfs(definition, ref structure);

            // Analyze definition to find the xml schema object to use
            if (IsSimpleTypeList(definition))
            {
                XmlSchemaSimpleType type = new XmlSchemaSimpleType
                {
                    Name = name
                };

                XmlSchemaSimpleTypeList list = new XmlSchemaSimpleTypeList
                {
                    Parent = type
                };

                type.Content = list;

                return type;
            }

            if (IsSimpleType(definition))
            {
                return new XmlSchemaSimpleType
                {
                    Name = name
                };
            }

            return new XmlSchemaComplexType
            {
                Name = name
            };
        }

        private JsonSchema CollapseSingleNestedAllOfs(JsonSchema definition, ref XsdStructureKeyword structure)
        {
            if (definition.TryGetKeyword(out XsdStructureKeyword newStructure))
            {
                structure = newStructure;
            }

            if (!definition.TryGetKeyword(out AllOfKeyword allOf))
            {
                return definition;
            }

            if (allOf.Schemas.Count != 1)
            {
                return definition;
            }

            return CollapseSingleNestedAllOfs(allOf.Schemas[0], ref structure);
        }

        private bool IsSimpleType(JsonSchema definition)
        {
            if (IsNonListTypeSchema(definition))
            {
                return true;
            }

            if (definition.HasKeyword<AllOfKeyword>(allOf => IsSimpleTypeRestriction(allOf.Schemas)))
            {
                return true;
            }

            return false;
        }

        private bool IsSimpleTypeList(JsonSchema definition)
        {
            if (!definition.HasKeyword<TypeKeyword>(type => type.Type == SchemaValueType.Array))
            {
                return false;
            }

            if (!definition.HasKeyword<ItemsKeyword>())
            {
                return false;
            }

            return true;
        }

        private static void HandleRef(XmlSchemaObject item, RefKeyword reference, WorkList<IJsonSchemaKeyword> keywords)
        {
            if (item is XmlSchema schema)
            {
                XmlSchemaElement element = new XmlSchemaElement
                {
                    Parent = schema,
                    Name = "melding",
                    SchemaTypeName = GetTypeFromReference(reference.Reference)
                };

                schema.Items.Add(element);
            }
            else
            {
                switch (item)
                {
                    case XmlSchemaElement x:
                        x.SchemaTypeName = GetTypeFromReference(reference.Reference);
                        break;
                    case XmlSchemaAttribute x:
                        x.SchemaTypeName = GetTypeFromReference(reference.Reference);
                        break;
                    case XmlSchemaSimpleContentExtension x:
                        x.BaseTypeName = GetTypeFromReference(reference.Reference);
                        break;
                    case XmlSchemaSimpleContentRestriction x:
                        x.BaseTypeName = GetTypeFromReference(reference.Reference);
                        break;
                    default:
                        throw new ArgumentException($"reference not supported on xml schema object of type {item.GetType().Name}");
                }
            }
        }

        private static XmlQualifiedName GetTypeFromReference(Uri reference)
        {
            JsonPointer pointer = JsonPointer.Parse(reference.OriginalString);
            return new XmlQualifiedName(pointer.Segments.Last().Value);
        }

        private void HandleNamespaces(XmlSchemaObject item, XsdNamespacesKeyword namespaces, bool ensureDefaultXmlNamespaces)
        {
            if (namespaces != null)
            {
                foreach ((string prefix, string ns) in namespaces.Namespaces)
                {
                    item.Namespaces.Add(prefix, ns);
                    _namespaces.Add(prefix, ns);
                }
            }

            if (ensureDefaultXmlNamespaces)
            {
                XmlQualifiedName[] ns = item.Namespaces.ToArray();
                if (ns.All(n => n.Namespace != XmlSchemaNamespace))
                {
                    item.Namespaces.Add("xsd", XmlSchemaNamespace);
                    _namespaces.Add("xsd", XmlSchemaNamespace);
                }

                if (ns.All(n => n.Namespace != XmlSchemaInstanceNamespace))
                {
                    item.Namespaces.Add("xsi", XmlSchemaInstanceNamespace);
                    _namespaces.Add("xsi", XmlSchemaInstanceNamespace);
                }
            }
        }

        private static void HandleSchemaAttributes(XmlSchema schema, XsdSchemaAttributesKeyword attributes)
        {
            if (attributes == null)
            {
                return;
            }

            foreach ((string name, string value) in attributes.Properties)
            {
                switch (name)
                {
                    case nameof(XmlSchema.AttributeFormDefault):
                        schema.AttributeFormDefault = Enum.Parse<XmlSchemaForm>(value);
                        break;
                    case nameof(XmlSchema.ElementFormDefault):
                        schema.ElementFormDefault = Enum.Parse<XmlSchemaForm>(value);
                        break;
                    case nameof(XmlSchema.BlockDefault):
                        schema.BlockDefault = Enum.Parse<XmlSchemaDerivationMethod>(value);
                        break;
                    case nameof(XmlSchema.FinalDefault):
                        schema.FinalDefault = Enum.Parse<XmlSchemaDerivationMethod>(value);
                        break;
                }
            }
        }

        private static void HandleInfo(XmlSchema schema, InfoKeyword info)
        {
            if (info == null || info.Value.ValueKind != JsonValueKind.Object)
            {
                return;
            }

            XmlSchemaAnnotation annotation = new XmlSchemaAnnotation { Parent = schema };
            XmlSchemaDocumentation doc = new XmlSchemaDocumentation();

            annotation.Items.Add(doc);
            doc.Parent = annotation;

            XmlDocument xmlDoc = new XmlDocument();
            List<XmlNode> markup = new List<XmlNode>();

            string nsPrefix = schema.Namespaces.ToArray().Single(ns => ns.Namespace == XmlSchemaNamespace).Name;

            foreach (JsonProperty property in info.Value.EnumerateObject())
            {
                XmlElement attribute = xmlDoc.CreateElement(nsPrefix, "attribute", XmlSchemaNamespace);
                attribute.SetAttribute("name", property.Name);
                attribute.SetAttribute("fixed", property.Value.GetString());
                markup.Add(attribute);
            }

            doc.Markup = markup.ToArray();
            schema.Items.Add(annotation);
        }
    }

    /// <summary>
    /// Placeholder
    /// </summary>
    public static class KeywordListExtensions
    {
        /// <summary>
        /// Placeholder
        /// </summary>
        public static bool AnyOf<T>(this IEnumerable<IJsonSchemaKeyword> keywords)
        {
            return keywords.Any(kw => kw is T);
        }

        /// <summary>
        /// Placeholder
        /// </summary>
        public static bool AnyOf<T1, T2, T3, T4, T5, T6, T7>(this IEnumerable<IJsonSchemaKeyword> keywords)
        {
            return keywords.Any(kw => kw is T1 or T2 or T3 or T4 or T5 or T6 or T7);
        }
    }

    /// <summary>
    /// Placeholder
    /// </summary>
    public enum ComplexTypeContentType
    {
        ComplexContent,
        SimpleContentExtensionOrRestriction
    }
}
