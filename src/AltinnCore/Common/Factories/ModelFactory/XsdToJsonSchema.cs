using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.Xml.Schema;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;

namespace AltinnCore.Common.Factories.ModelFactory
{
    /// <summary>
    /// For, like, converting Xsd to JsonSchema
    /// </summary>
    public class XsdToJsonSchema
    {
        private XmlReader xsdReader;
        private XmlSchema mainXsd;
        private JsonSchema mainJsonSchema;

        private IDictionary<XmlSchemaObject, string> itemNames = new Dictionary<XmlSchemaObject, string>();
        private IDictionary<XmlSchemaObject, string> typeNames = new Dictionary<XmlSchemaObject, string>();

        /// <summary>
        /// Initializes a new instance of the <see cref="XsdToJsonSchema"/> class.
        /// </summary>
        /// <param name="xsdReader">Reader for the XSD to convert</param>
        public XsdToJsonSchema(XmlReader xsdReader)
        {
            this.xsdReader = xsdReader;
        }

        /// <summary>
        /// Perform the actual conversion
        /// </summary>
        /// <returns>JsonValue for root of Json Schema representation of schema</returns>
        public JsonValue AsJsonSchema()
        {
            // Read XSD
            mainXsd = XmlSchema.Read(xsdReader, ValidationCallback);

            // Set up Json Schema object
            mainJsonSchema = new JsonSchema();
            mainJsonSchema.OtherData.Add("$schema", new Manatee.Json.JsonValue("http://json-schema.org/schema#"));
            mainJsonSchema.OtherData.Add("$id", new Manatee.Json.JsonValue(Guid.NewGuid().ToString()));
            AddTypeObject(mainJsonSchema);

            XmlSchemaObjectEnumerator enumerator = mainXsd.Items.GetEnumerator();
            while (enumerator.MoveNext())
            {
                XmlSchemaObject item = enumerator.Current;

                if (item is XmlSchemaElement)
                {
                    bool isRequired;
                    JsonSchema itemSchema = ParseTopLevelElement((XmlSchemaElement)item, out isRequired);
                    if (itemSchema != null)
                    {
                        mainJsonSchema.Property(GetItemName(item), itemSchema);
                    }
                }
            }

            enumerator = mainXsd.Items.GetEnumerator();
            while (enumerator.MoveNext())
            {
                XmlSchemaObject item = enumerator.Current;

                bool isRequired;
                object parsedObject = Parse(item, out isRequired);
                if (parsedObject == null)
                {
                }
                else if (parsedObject is string)
                {
                    mainJsonSchema.Description((string)parsedObject);
                }
                else if (parsedObject is JsonSchema)
                {
                    JsonSchema parsedSchema = (JsonSchema)parsedObject;
                    if (!(item is XmlSchemaElement) && parsedSchema != null)
                    {
                        AddDefinition(item, parsedSchema);
                    }
                }
                else
                {
                    throw new NotImplementedException();
                }
            }

            return new JsonSerializer().Serialize<JsonSchema>(mainJsonSchema);
        }

        private object Parse(XmlSchemaObject item, out bool isRequired)
        {
            isRequired = false;

            if (item is XmlSchemaElement)
            {
                return ParseElement((XmlSchemaElement)item, out isRequired);
            }
            else if (item is XmlSchemaComplexType)
            {
                return ParseComplexType((XmlSchemaComplexType)item);
            }
            else if (item is XmlSchemaSimpleType)
            {
                JsonSchema simpleTypeSchema = new JsonSchema();
                AppendSimpleType((XmlSchemaSimpleType)item, simpleTypeSchema);
                return simpleTypeSchema;
            }
            else if (item is XmlSchemaAnnotation)
            {
                return ParseAnnotation((XmlSchemaAnnotation)item);
            }
            else if (item is XmlSchemaGroup)
            {
                // Do nothing. xsd:group is expanded in place
                return null;
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private JsonSchema ParseTopLevelElement(XmlSchemaElement item, out bool isRequired)
        {
            return ParseElement(item, true, out isRequired);
        }

        private JsonSchema ParseElement(XmlSchemaElement item, out bool isRequired)
        {
            return ParseElement(item, false, out isRequired);
        }

        private JsonSchema ParseElement(XmlSchemaElement item, bool isFirstPass, out bool isRequired)
        {
            string elementName = GetItemName(item); // This will become either .Name of .RefName.Name

            isRequired = false;

            JsonSchema elementSchema = new JsonSchema();

            if (item.Annotation != null)
            {
                string annotated = ParseAnnotated(item);
                if (annotated != null && annotated.Length > 0)
                {
                    elementSchema.Description(annotated);
                }
            }

            if (item.Constraints.Count > 0)
            {
                throw new NotImplementedException();
            }

            if (item.DefaultValue != null)
            {
                throw new NotImplementedException();
            }

            if (item.ElementSchemaType != null)
            {
                throw new NotImplementedException();
            }

            if (item.ElementType != null)
            {
                throw new NotImplementedException();
            }

            if (item.Final != XmlSchemaDerivationMethod.None)
            {
                throw new NotImplementedException();
            }

            if (item.FixedValue != null)
            {
                throw new NotImplementedException();
            }

            if (item.IsAbstract)
            {
                throw new NotImplementedException();
            }

            if (!item.IsNillable)
            {
                // ToDo
            }

            if (item.MinOccurs >= 1 ||
                (item.MinOccursString != null && Convert.ToUInt32(item.MinOccursString) >= 1))
            {
                isRequired = true;
            }

            if (item.MaxOccursString != null)
            {
                // This is handled when appending type info
            }

            if (!item.RefName.IsEmpty)
            {
                AppendType(FindObject(elementName), elementSchema); // Elementname is already set to refName here
            }

            if (item.SchemaType != null)
            {
                if (isFirstPass)
                {
                    AppendType(item, elementSchema);
                }
                else
                {
                    if (item.SchemaType is XmlSchemaComplexType)
                    {
                        string complexTypeName = GetItemName(item.SchemaType);
                        JsonSchema complexTypeSchema = ParseComplexType((XmlSchemaComplexType)item.SchemaType);
                        AddDefinition(item.SchemaType, complexTypeSchema);
                        AppendTypeFromNameInternal(new XmlQualifiedName(complexTypeName), elementSchema);
                    }
                    else if (item.SchemaType is XmlSchemaSimpleType)
                    {
                        string simpleTypeName = GetItemName(item.SchemaType);
                        JsonSchema simpleTypeSchema = new JsonSchema();
                        AppendSimpleType((XmlSchemaSimpleType)item.SchemaType, simpleTypeSchema);
                        AddDefinition(item.SchemaType, simpleTypeSchema);
                    }
                    else
                    {
                        throw new NotImplementedException();
                    }
                }
            }

            if (!item.SchemaTypeName.IsEmpty)
            {
                AppendType(item, elementSchema);
            }

            return elementSchema;
        }

        private JsonSchema ParseComplexType(XmlSchemaComplexType item)
        {
            JsonSchema complexTypeSchema = new JsonSchema();
            List<string> requiredList = new List<string>();

            if (item.Annotation != null)
            {
                string annotation = ParseAnnotated(item);
                if (annotation != null && annotation.Length > 0)
                {
                    complexTypeSchema.Description(annotation);
                }
            }

            if (item.Attributes.Count > 0)
            {
                foreach (XmlSchemaAttribute attribute in item.Attributes)
                {
                    bool isRequired;
                    JsonSchema attributeSchema = ParseAttribute(attribute, out isRequired);
                    if (attributeSchema != null)
                    {
                        string name = GetItemName(attribute);
                        complexTypeSchema.Property(name, attributeSchema);
                        if (isRequired)
                        {
                            requiredList.Add(name);
                        }
                    }
                }
            }

            if (item.BaseSchemaType != null)
            {
                throw new NotImplementedException();
            }

            if (item.BaseXmlSchemaType != null)
            {
                throw new NotImplementedException();
            }

            if (item.ContentModel != null)
            {
                if (item.ContentModel is XmlSchemaComplexContent)
                {
                    AppendComplexContent((XmlSchemaComplexContent)item.ContentModel, complexTypeSchema);
                }
                else if (item.ContentModel is XmlSchemaSimpleContent)
                {
                    AppendSimpleContent((XmlSchemaSimpleContent)item.ContentModel, complexTypeSchema);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }

            if (item.Particle != null)
            {
                AppendParticle(item.Particle, complexTypeSchema, requiredList);
            }

            if (requiredList.Count > 0)
            {
                complexTypeSchema.Required(requiredList.ToArray());
            }

            return complexTypeSchema;
        }

        private void AppendSimpleType(XmlSchemaSimpleType item, JsonSchema appendToSchema)
        {
            if (item.Annotation != null)
            {
                string annotation = ParseAnnotated(item);
                if (annotation != null && annotation.Length > 0)
                {
                    appendToSchema.Description(annotation);
                }
            }

            if (item.BaseSchemaType != null)
            {
                throw new NotImplementedException();
            }

            if (item.BaseXmlSchemaType != null)
            {
                throw new NotImplementedException();
            }

            if (item.Content != null)
            {
                XmlSchemaSimpleTypeContent simpleTypeContent = item.Content;
                if (simpleTypeContent is XmlSchemaSimpleTypeRestriction)
                {
                    XmlSchemaSimpleTypeRestriction simpleTypeRestriction = (XmlSchemaSimpleTypeRestriction)simpleTypeContent;

                    if (simpleTypeRestriction.Facets != null && simpleTypeRestriction.Facets.Count > 0)
                    {
                        List<JsonValue> enumList = new List<JsonValue>();

                        foreach (XmlSchemaFacet facet in simpleTypeRestriction.Facets)
                        {
                            if (facet is XmlSchemaEnumerationFacet)
                            {
                                enumList.Add(new JsonValue(facet.Value));
                            }
                            else if (facet is XmlSchemaMinLengthFacet || facet is XmlSchemaMinInclusiveFacet)
                            {
                                try
                                {
                                    appendToSchema.MinLength(Convert.ToUInt32(facet.Value));
                                }
                                catch (Exception)
                                {
                                }
                            }
                            else if (facet is XmlSchemaMaxLengthFacet || facet is XmlSchemaMaxInclusiveFacet)
                            {
                                try
                                {
                                    appendToSchema.MaxLength(Convert.ToUInt32(facet.Value));
                                }
                                catch (Exception)
                                {
                                }
                            }
                            else if (facet is XmlSchemaLengthFacet || facet is XmlSchemaTotalDigitsFacet)
                            {
                                try
                                {
                                    appendToSchema.MinLength(Convert.ToUInt32(facet.Value));
                                }
                                catch (Exception)
                                {
                                }

                                try
                                {
                                    appendToSchema.MaxLength(Convert.ToUInt32(facet.Value));
                                }
                                catch (Exception)
                                {
                                }
                            }
                            else if (facet is XmlSchemaPatternFacet)
                            {
                                appendToSchema.Pattern(facet.Value);
                            }
                            else if (facet is XmlSchemaFractionDigitsFacet)
                            {
                                // Use pattern?
                            }
                            else
                            {
                                throw new NotImplementedException();
                            }
                        }

                        if (enumList.Count > 0)
                        {
                            appendToSchema.Enum(enumList.ToArray());
                        }
                    }

                    AppendTypeFromSchemaTypeInternal(simpleTypeRestriction.BaseType, simpleTypeRestriction.BaseTypeName, appendToSchema);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }

            if (item.Datatype != null)
            {
                throw new NotImplementedException();
            }
        }

        private JsonSchema ParseAttribute(XmlSchemaAttribute attribute, out bool isRequired)
        {
            JsonSchema attributeSchema = new JsonSchema();

            isRequired = false;

            attributeSchema.OtherData.Add("@xsdType", new Manatee.Json.JsonValue("XmlAttribute"));

            if (attribute.Annotation != null)
            {
                string annotated = ParseAnnotated(attribute);
                if (annotated != null && annotated.Length > 0)
                {
                    attributeSchema.Description(annotated);
                }
            }

            if (attribute.AttributeSchemaType != null)
            {
                throw new NotImplementedException();
            }

            if (attribute.AttributeType != null)
            {
                throw new NotImplementedException();
            }

            if (attribute.FixedValue != null)
            {
                attributeSchema.OtherData.Add("const", new Manatee.Json.JsonValue(attribute.FixedValue));
            }

            if (!attribute.QualifiedName.IsEmpty)
            {
                throw new NotImplementedException();
            }

            if (!attribute.RefName.IsEmpty)
            {
                throw new NotImplementedException();
            }

            if (attribute.SchemaType != null)
            {
                AppendSimpleType(attribute.SchemaType, attributeSchema);
            }

            if (!attribute.SchemaTypeName.IsEmpty)
            {
                AppendTypeFromNameInternal(attribute.SchemaTypeName, attributeSchema);
            }

            if (attribute.Use == XmlSchemaUse.Required)
            {
                isRequired = true;
            }

            return attributeSchema;
        }

        private JsonSchema ParseParticle(XmlSchemaParticle item, out bool isRequired)
        {
            JsonSchema particleSchema = new JsonSchema();

            isRequired = false;

            if (item is XmlSchemaElement)
            {
                return ParseElement((XmlSchemaElement)item, out isRequired);
            }
            else if (item is XmlSchemaChoice)
            {
                throw new NotImplementedException();
                /*
                List<JsonSchema> oneOfSchemaList = new List<JsonSchema>();
                foreach (XmlSchemaObject choiceItem in ((XmlSchemaChoice)item).Items)
                {
                    JsonSchema oneOfSchema = new JsonSchema();
                    AddType(choiceItem, oneOfSchema);
                    oneOfSchemaList.Add(oneOfSchema);
                }

                resultSchema.OneOf(oneOfSchemaList.ToArray());
                */
            }
            else if (item is XmlSchemaGroupRef)
            {
                throw new NotImplementedException();

                // ExpandAndCopyGroupRef((XmlSchemaGroupRef)item, resultSchema, requiredList);
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private void AppendParticle(XmlSchemaParticle particle, JsonSchema appendToSchema, List<string> requiredList)
        {
            if (particle == null)
            {
            }
            else if (particle is XmlSchemaSequence)
            {
                foreach (XmlSchemaParticle item in ((XmlSchemaSequence)particle).Items)
                {
                    AppendParticleProperty(item, appendToSchema, requiredList);
                }
            }
            else if (particle is XmlSchemaGroupRef)
            {
                ExpandAndAppendGroupRef((XmlSchemaGroupRef)particle, appendToSchema, requiredList);
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private void AppendParticleProperty(XmlSchemaParticle item, JsonSchema appendToSchema, List<string> requiredList)
        {
            if (item is XmlSchemaElement)
            {
                string elementName = GetItemName(item);
                bool isRequired;
                JsonSchema elementSchema = ParseElement((XmlSchemaElement)item, out isRequired);
                appendToSchema.Property(elementName, elementSchema);

                if (isRequired)
                {
                    requiredList.Add(elementName);
                }
            }
            else if (item is XmlSchemaChoice)
            {
                List<JsonSchema> oneOfSchemaList = new List<JsonSchema>();
                foreach (XmlSchemaObject choiceItem in ((XmlSchemaChoice)item).Items)
                {
                    JsonSchema oneOfSchema = new JsonSchema();
                    AppendType(choiceItem, oneOfSchema);
                    oneOfSchemaList.Add(oneOfSchema);
                }

                appendToSchema.OneOf(oneOfSchemaList.ToArray());
            }
            else if (item is XmlSchemaGroupRef)
            {
                ExpandAndAppendGroupRef((XmlSchemaGroupRef)item, appendToSchema, requiredList);
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private string ParseAnnotated(XmlSchemaAnnotated annotatedItem)
        {
            return annotatedItem == null ? null : ParseAnnotation(annotatedItem.Annotation);
        }

        private string ParseAnnotation(XmlSchemaAnnotation annotationItem)
        {
            if (annotationItem == null)
            {
                return null;
            }

            string s = string.Empty;
            foreach (XmlSchemaDocumentation item in annotationItem.Items)
            {
                foreach (XmlNode markup in item.Markup)
                {
                    if (s.Length != 0)
                    {
                        s += '\n';
                    }

                    if (markup.OuterXml != null)
                    {
                        s += markup.OuterXml;
                    }
                    else if (markup.Value != null)
                    {
                        s += markup.Value;
                    }
                    else
                    {
                        throw new NotImplementedException();
                    }
                }
            }

            return s;
        }

        private string AppendTypeFromSchemaTypeInternal(XmlSchemaType schemaType, XmlQualifiedName schemaTypeName, JsonSchema appendToSchema)
        {
            if (!schemaTypeName.IsEmpty)
            {
                return AppendTypeFromNameInternal(schemaTypeName, appendToSchema);
            }
            else
            {
                return AppendTypeFromNameInternal(new XmlQualifiedName(GetItemName(schemaType)), appendToSchema);
            }
        }

        private string AppendTypeFromNameInternal(XmlQualifiedName qname, JsonSchema appendToSchema)
        {
            string type = (qname == null) ? null : qname.ToString();
            string name = (qname == null) ? null : qname.Name;
            if ((type == null || type.Length == 0) && (name == null || name.Length == 0))
            {
                throw new ArgumentException();
            }

            if ("http://www.w3.org/2001/XMLSchema:string".Equals(type)
                || "http://www.w3.org/2001/XMLSchema:normalizedString".Equals(type)
                || "http://www.w3.org/2001/XMLSchema:token".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.String);
            }
            else if ("http://www.w3.org/2001/XMLSchema:boolean".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.Boolean);
            }
            else if ("http://www.w3.org/2001/XMLSchema:integer".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.Integer);
            }
            else if ("http://www.w3.org/2001/XMLSchema:positiveInteger".Equals(type)
                     || "http://www.w3.org/2001/XMLSchema:nonNegativeInteger".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.Integer);
                appendToSchema.Minimum(0);
            }
            else if ("http://www.w3.org/2001/XMLSchema:short".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.Integer);
                appendToSchema.Minimum(short.MinValue);
                appendToSchema.Maximum(short.MaxValue);
            }
            else if ("http://www.w3.org/2001/XMLSchema:long".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.Integer);
                appendToSchema.Minimum(long.MinValue);
                appendToSchema.Maximum(long.MaxValue);
            }
            else if ("http://www.w3.org/2001/XMLSchema:double".Equals(type)
                     || "http://www.w3.org/2001/XMLSchema:decimal".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.Number);
            }
            else if ("http://www.w3.org/2001/XMLSchema:date".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.String);
                appendToSchema.Format(StringFormat.GetFormat("date"));
            }
            else if ("http://www.w3.org/2001/XMLSchema:time".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.String);
                appendToSchema.Format(StringFormat.GetFormat("time"));
            }
            else if ("http://www.w3.org/2001/XMLSchema:dateTime".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.String);
                appendToSchema.Format(StringFormat.DateTime);
            }
            else if ("http://www.w3.org/2001/XMLSchema:gYear".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.String);
                appendToSchema.Format(StringFormat.GetFormat("year"));
            }
            else if ("http://www.w3.org/2001/XMLSchema:gYearMonth".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.String);
                appendToSchema.Format(StringFormat.GetFormat("year-month"));
            }
            else if ("http://www.w3.org/2001/XMLSchema:base64Binary".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.String);
                appendToSchema.ContentEncoding("base64");
            }
            else if ("http://www.w3.org/2001/XMLSchema:anyURI".Equals(type))
            {
                appendToSchema.Type(JsonSchemaType.String);
            }
            else if (type.StartsWith("http://www.w3.org/2001/XMLSchema:"))
            {
                throw new NotImplementedException();
            }
            else
            {
                if (name == null)
                {
                    AddTypeObject(appendToSchema);
                }
                else
                {
                    appendToSchema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + name));
                    return name;
                }
            }

            return null;
        }

        private void AppendType(XmlSchemaObject item, JsonSchema appendToSchema)
        {
            if (item is XmlSchemaElement)
            {
                XmlSchemaElement elementItem = (XmlSchemaElement)item;
                if (elementItem.MaxOccurs > 1)
                {
                    appendToSchema.Type(JsonSchemaType.Array);
                    appendToSchema.MinItems(Convert.ToUInt32(elementItem.MinOccurs));
                    if (!"unbounded".Equals(elementItem.MaxOccursString))
                    {
                        appendToSchema.MaxItems(Convert.ToUInt32(elementItem.MaxOccurs));
                    }

                    JsonSchema[] itemsSchemas = new JsonSchema[1];
                    itemsSchemas[0] = new JsonSchema();

                    AppendTypeFromSchemaTypeInternal(elementItem.SchemaType, elementItem.SchemaTypeName, itemsSchemas[0]);
                    appendToSchema.Items(itemsSchemas);
                }
                else
                {
                    AppendTypeFromSchemaTypeInternal(elementItem.SchemaType, elementItem.SchemaTypeName, appendToSchema);
                }
            }
            else if (item is XmlSchemaType)
            {
                throw new NotImplementedException();

                // AddDefinition(resultSchema, ObjectName(item), GenerateSchemaType((XmlSchemaType)item));
                /*
                XmlSchemaType itemSchemaType = (XmlSchemaType)item;
                if (itemSchemaType.BaseSchemaType != null)
                {
                    throw new NotImplementedException();

                    // AddTypeFromSchemaTypeInternal(itemSchemaType.BaseSchemaType, qname, elementName, resultSchema);
                }
                else
                {
                    throw new NotImplementedException();
                }
                */
            }
            else if (item is XmlSchemaSimpleTypeRestriction)
            {
                XmlSchemaSimpleTypeRestriction simpleTypeRestriction = (XmlSchemaSimpleTypeRestriction)item;
                AppendTypeFromSchemaTypeInternal(simpleTypeRestriction.BaseType, simpleTypeRestriction.BaseTypeName, appendToSchema);
            }
            else if (item is XmlSchemaSequence)
            {
                List<string> requiredList = new List<string>();
                AppendParticle((XmlSchemaSequence)item, appendToSchema, requiredList);

                if (requiredList.Count > 0)
                {
                    appendToSchema.Required(requiredList.ToArray());
                }
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private bool HasDefinition(string name)
        {
            return mainJsonSchema.Definitions() != null && mainJsonSchema.Definitions().ContainsKey(name);
        }

        private void AddDefinition(XmlSchemaObject item, JsonSchema definition)
        {
            string name = GetItemName(item);
            if (!HasDefinition(name))
            {
                mainJsonSchema.Definition(name, definition);
            }
            else
            {
                throw new XmlSchemaException();
            }
        }

        private void AppendDefinition(JsonSchema appendToSchema, XmlSchemaObject item, JsonSchema definitionSchema)
        {
            if (appendToSchema == mainJsonSchema)
            {
                AddDefinition(item, definitionSchema);
            }
            else
            {
                AddTypeObject(appendToSchema);
                appendToSchema.Property(GetItemName(item), definitionSchema);
            }
        }

        private void ExpandAndAppendGroupRef(XmlSchemaGroupRef groupRefItem, JsonSchema appendToSchema, List<string> requiredList)
        {
            XmlSchemaObject groupObject = FindObject(groupRefItem.RefName.ToString());
            if (groupObject != null)
            {
                if (groupObject is XmlSchemaGroup)
                {
                    AppendParticle(((XmlSchemaGroup)groupObject).Particle, appendToSchema, requiredList);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }
        }

        private void AppendComplexContent(XmlSchemaComplexContent item, JsonSchema appendToSchema)
        {
            if (item.Annotation != null)
            {
                string annotated = ParseAnnotated(item);
                if (annotated != null && annotated.Length > 0)
                {
                    appendToSchema.Description(annotated);
                }
            }

            if (item.Content != null)
            {
                AppendContent(item.Content, appendToSchema);
            }
        }

        private void AppendSimpleContent(XmlSchemaSimpleContent item, JsonSchema appendToSchema)
        {
            if (item.Annotation != null)
            {
                string annotated = ParseAnnotated(item);
                if (annotated != null && annotated.Length > 0)
                {
                    appendToSchema.Description(annotated);
                }
            }

            if (item.Content != null)
            {
                AppendContent(item.Content, appendToSchema);
            }
        }

        private void AppendContent(XmlSchemaContent item, JsonSchema appendToSchema)
        {
            if (item is XmlSchemaSimpleContentExtension)
            {
                XmlSchemaSimpleContentExtension contentExtensionItem = (XmlSchemaSimpleContentExtension)item;
                if (contentExtensionItem.Annotation != null)
                {
                    string annotated = ParseAnnotated(item);
                    if (annotated != null && annotated.Length > 0)
                    {
                        appendToSchema.Description(annotated);
                    }
                }

                if (contentExtensionItem.Attributes.Count > 0)
                {
                    foreach (XmlSchemaAttribute attribute in contentExtensionItem.Attributes)
                    {
                        bool isRequired;
                        JsonSchema attributeSchema = ParseAttribute(attribute, out isRequired);
                        if (attributeSchema != null)
                        {
                            string name = GetItemName(attribute);
                            appendToSchema.Property(name, attributeSchema);
                            if (isRequired)
                            {
                                int d = 0;

                                // throw new NotImplementedException();
                                // requiredList.Add(name);
                            }
                        }
                    }
                }

                if (!contentExtensionItem.BaseTypeName.IsEmpty)
                {
                    AppendTypeFromNameInternal(contentExtensionItem.BaseTypeName, appendToSchema);
                }
            }
            else if (item is XmlSchemaComplexContentExtension)
            {
                XmlSchemaComplexContentExtension contentExtensionItem = (XmlSchemaComplexContentExtension)item;

                bool isInherit = !contentExtensionItem.BaseTypeName.IsEmpty;
                List<JsonSchema> allOfList = new List<JsonSchema>();
                JsonSchema definitionSchema = new JsonSchema();

                if (contentExtensionItem.Annotation != null)
                {
                    string annotated = ParseAnnotated(item);
                    if (annotated != null && annotated.Length > 0)
                    {
                        appendToSchema.Description(annotated);
                    }
                }

                if (contentExtensionItem.Attributes.Count > 0)
                {
                    foreach (XmlSchemaAttribute attribute in contentExtensionItem.Attributes)
                    {
                        bool isRequired;
                        JsonSchema attributeSchema = ParseAttribute(attribute, out isRequired);
                        if (attributeSchema != null)
                        {
                            string name = GetItemName(attribute);
                            appendToSchema.Property(name, attributeSchema);
                            if (isRequired)
                            {
                                throw new NotImplementedException();

                                // requiredList.Add(name);
                            }
                        }
                    }
                }

                if (!contentExtensionItem.BaseTypeName.IsEmpty)
                {
                    JsonSchema inheritFromSchema = new JsonSchema();
                    AppendTypeFromNameInternal(contentExtensionItem.BaseTypeName, inheritFromSchema);
                    allOfList.Add(inheritFromSchema);
                }

                if (contentExtensionItem.Particle != null)
                {
                    JsonSchema usingSchema = isInherit ? new JsonSchema() : definitionSchema;
                    List<string> requiredList = new List<string>();

                    AppendParticle(contentExtensionItem.Particle, usingSchema, requiredList);

                    if (requiredList.Count > 0)
                    {
                        usingSchema.Required(requiredList.ToArray());
                    }

                    if (isInherit)
                    {
                        allOfList.Add(usingSchema);
                    }
                }

                if (allOfList.Count > 0)
                {
                    AddTypeObject(appendToSchema);
                    appendToSchema.AllOf(allOfList.ToArray());
                }

                if (definitionSchema.Count > 0)
                {
                    AppendDefinition(appendToSchema, contentExtensionItem, definitionSchema);
                }
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private void AddTypeObject(JsonSchema appendToSchema)
        {
            if (!appendToSchema.Exists(e => "type".Equals(e.Name)))
            {
                appendToSchema.Type(JsonSchemaType.Object);
            }
        }

        private XmlSchemaObject FindObject(string name)
        {
            XmlSchemaObjectEnumerator enumerator = mainXsd.Items.GetEnumerator();
            while (enumerator.MoveNext())
            {
                XmlSchemaObject xmlSchemaObject = enumerator.Current;

                string objectName = null;
                if (xmlSchemaObject is XmlSchemaGroup)
                {
                    objectName = ((XmlSchemaGroup)xmlSchemaObject).Name;
                }
                else if (xmlSchemaObject is XmlSchemaElement)
                {
                    objectName = ((XmlSchemaElement)xmlSchemaObject).Name;
                }
                else if (xmlSchemaObject is XmlSchemaType)
                {
                    objectName = ((XmlSchemaType)xmlSchemaObject).Name;
                }
                else
                {
                    throw new NotImplementedException();
                }

                if (name.Equals(objectName))
                {
                    return xmlSchemaObject;
                }
            }

            return null;
        }

        private string GetItemName(XmlSchemaObject item)
        {
            if (item == null)
            {
                return null;
            }

            if (itemNames.ContainsKey(item))
            {
                return itemNames[item];
            }

            if (item is XmlSchemaElement)
            {
                XmlSchemaElement elementItem = (XmlSchemaElement)item;
                string name = elementItem.Name;
                if (name == null && elementItem.RefName != null)
                {
                    XmlSchemaObject refObject = FindObject(elementItem.RefName.ToString());
                    name = GetItemName(refObject);
                }

                return RegisterItemName(item, name);
            }
            else if (item is XmlSchemaAttribute)
            {
                XmlSchemaAttribute attributeItem = (XmlSchemaAttribute)item;
                string name = attributeItem.Name;
                if (name == null && attributeItem.RefName != null)
                {
                    XmlSchemaObject refObject = FindObject(attributeItem.RefName.ToString());
                    name = GetItemName(refObject);
                }

                return RegisterItemName(item, name);
            }
            else if (item is XmlSchemaType)
            {
                string name = ((XmlSchemaType)item).Name;

                if (name == null)
                {
                    name = GetItemName(item.Parent);

                    if (typeNames.Values.Contains(name))
                    {
                        name = GenerateAnonymousTypeName((XmlSchemaType)item);
                    }
                }

                return RegisterItemName(item, name);
            }
            else if (item is XmlSchemaGroup)
            {
                return RegisterItemName(item, ((XmlSchemaGroup)item).Name);
            }
            else
            {
                return RegisterItemName(item, null);
            }
        }

        private string RegisterItemName(XmlSchemaObject item, string name)
        {
            if (name == null)
            {
                name = GetItemName(item.Parent);
            }

            if (name != null)
            {
                itemNames[item] = name;

                if (item is XmlSchemaType)
                {
                    typeNames[item] = name;
                }
            }

            return name;
        }

        private string GenerateAnonymousTypeName(XmlSchemaType item)
        {
            if (itemNames.ContainsKey(item))
            {
                return itemNames[item];
            }

            string tmpName = item.Name;
            if (tmpName == null)
            {
                tmpName = GetItemName(item.Parent);

                if (tmpName == null)
                {
                    throw new XmlSchemaException();
                }
            }

            string typeName;

            // string typeNamePart = tmpName.Substring(0, 1).ToUpper() + tmpName.Substring(1); //Use this to force first letter uppercase
            string typeNamePart = tmpName;

            int i = 0;
            while (true)
            {
                i++;

                typeName = typeNamePart;
                if (i > 1)
                {
                    typeName += i.ToString();
                }

                // Is name unused?
                if (!itemNames.Values.Contains(typeName) &&
                    !HasDefinition(typeName))
                {
                    break;
                }
            }

            return RegisterItemName(item, typeName);
        }

        private JsonSchemaType JsonSchemaTypeFromString(string type)
        {
            switch (type.ToLower())
            {
                case "array": return JsonSchemaType.Array;
                case "boolean": return JsonSchemaType.Boolean;
                case "integer": return JsonSchemaType.Integer;
                case "null": return JsonSchemaType.Null;
                case "number": return JsonSchemaType.Number;
                case "object": return JsonSchemaType.Object;
                case "string": return JsonSchemaType.String;
                default: return JsonSchemaType.NotDefined;
            }
        }

        private bool IsTopLevel(XmlSchemaObject item)
        {
            return item.Parent == mainXsd;
        }

        private static void ValidationCallback(object sender, ValidationEventArgs args)
        {
            throw new NotImplementedException();
        }
    }
}
