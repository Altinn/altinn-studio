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

        private List<string> anonymousTypes = new List<string>();

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

            // Iterate XSD, converting all top-level xsd:element and their dependencies
            XmlSchemaObjectEnumerator enumerator = mainXsd.Items.GetEnumerator();
            while (enumerator.MoveNext())
            {
                if (enumerator.Current is XmlSchemaElement)
                {
                    ParseRootElement((XmlSchemaElement)enumerator.Current);
                }
                else if (enumerator.Current is XmlSchemaGroup)
                {
// ParseRootGroup((XmlSchemaGroup)enumerator.Current);
                }
                else if (enumerator.Current is XmlSchemaSimpleType)
                {
                    ParseRootSimpleType((XmlSchemaSimpleType)enumerator.Current);
                }
                else if (enumerator.Current is XmlSchemaComplexType)
                {
                    ParseRootComplexType((XmlSchemaComplexType)enumerator.Current);
                }
                else if (enumerator.Current is XmlSchemaAnnotation)
                {
                    ParseRootAnnotation((XmlSchemaAnnotation)enumerator.Current);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }

            return new JsonSerializer().Serialize<JsonSchema>(mainJsonSchema);
        }

        private void ParseRootElement(XmlSchemaElement item)
        {
            ParseElement(item, mainJsonSchema);
        }

        private void ParseElement(XmlSchemaElement item, JsonSchema resultSchema)
        {
            /*if (item.Parent != mainXsd)
            {
                throw new NotImplementedException();
            }*/

            JsonSchema definitionSchema = new JsonSchema();

            if (item.Annotation != null)
            {
                AddAnnotated(item, definitionSchema);
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

            // if (item.MinOccursString != null) {} //MinOccurs is handled elsewhere (search for .Required )
            if (item.MaxOccursString != null)
            {
                int d = 0;
            }

            if (!item.RefName.IsEmpty)
            {
                XmlSchemaObject refObject = FindObject(item.RefName.ToString());
                definitionSchema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + ObjectName(refObject)));
            }

            if (item.SchemaType != null)
            {
                // definitionName = item.Name;
                if (item.SchemaType is XmlSchemaComplexType)
                {
                    XmlSchemaComplexType complexType = (XmlSchemaComplexType)item.SchemaType;
                    string anonymousName = ObjectNameOrAnonymous(item);
                    AddType(item.SchemaType, definitionSchema);

                    // AddNamedComplexType(mainJsonSchema, complexType, anonymousName);
                    // anonymousTypes.Add(anonymousName);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }

            if (!item.SchemaTypeName.IsEmpty)
            {
                AddType(item, definitionSchema);
            }

            /*
            if (isTopLevelElement)
            {*/
            /*
                string name = ObjectName(item);
                if (!convertedTypes.Contains(name))
                {
                    convertedTypes.Add(name);
                }
                */

            AddDefinition(resultSchema, ObjectName(item), definitionSchema);

            if (item.Parent == mainXsd)
            {
                AddElementAsRootProperty(item);
            }

            /*}
            else
            {
                resultSchema.Property(ObjectNameOrAnonymous(item), definitionSchema);
            }*/
        }

        private void ParseSchemaType(XmlSchemaType item, JsonSchema resultSchema)
        {
            if (item is XmlSchemaComplexType)
            {
                ParseComplexType((XmlSchemaComplexType)item, resultSchema);
            }
            else if (item is XmlSchemaSimpleType)
            {
                ParseSimpleType((XmlSchemaSimpleType)item, resultSchema);
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private void ParseRootComplexType(XmlSchemaComplexType item)
        {
            ParseComplexType(item, mainJsonSchema);
        }

        private void ParseComplexType(XmlSchemaComplexType item, JsonSchema resultSchema)
        {
            /*
            if (item.Parent != mainXsd)
            {
                throw new NotImplementedException();
            }
            */
            JsonSchema definitionSchema = new JsonSchema();
            List<string> requiredList = new List<string>();

            if (item.Annotation != null)
            {
                AddAnnotated(item, definitionSchema);
            }

            if (item.Attributes.Count > 0)
            {
                AddAttributes(item.Attributes, definitionSchema, requiredList);
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
                AddContentModel(item.ContentModel, definitionSchema);
            }

            if (item.Particle != null)
            {
                AddParticle(item.Particle, definitionSchema, requiredList);
            }

            if (requiredList.Count > 0)
            {
                definitionSchema.Required(requiredList.ToArray());
            }

            string name = ObjectName(item);
            AddDefinition(resultSchema, ObjectName(item), definitionSchema);
        }

        private void ParseRootSimpleType(XmlSchemaSimpleType item)
        {
            ParseSimpleType(item, mainJsonSchema);
        }

        private void ParseSimpleType(XmlSchemaSimpleType item, JsonSchema resultSchema)
        {
            /*
            if (item.Parent != mainXsd)
            {
                throw new NotImplementedException();
            }
            */

            JsonSchema definitionSchema = new JsonSchema();

            if (item.Annotation != null)
            {
                AddAnnotated(item, definitionSchema);
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
                AddSimpleType(item, definitionSchema);
            }

            if (item.Datatype != null)
            {
                throw new NotImplementedException();
            }

            string name = ObjectName(item);
            AddDefinition(resultSchema, ObjectName(item), definitionSchema);
        }

        private void ParseRootAnnotation(XmlSchemaAnnotation item)
        {
            AddAnnotation(item, mainJsonSchema);
        }

        private void ExpandGroup(XmlSchemaGroup item, JsonSchema resultSchema)
        {
            if (item.Parent != mainXsd)
            {
                throw new NotImplementedException();
            }

            // throw new NotImplementedException();
            int d = 0;
        }

        private void AddElementAsRootProperty(XmlSchemaElement item)
        {
            XmlSchemaElement itemElement = (XmlSchemaElement)item;
            JsonSchema propertySchema = new JsonSchema();
            string propertyName = NameOrQualifiedName(null, itemElement.SchemaTypeName);
            propertySchema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + propertyName));
            mainJsonSchema.Property(itemElement.Name, propertySchema);
        }

        private void AddAttributes(XmlSchemaObjectCollection attributes, JsonSchema resultSchema, List<string> requiredList)
        {
            foreach (XmlSchemaAttribute attribute in attributes)
            {
                JsonSchema propertySchema = new JsonSchema();
                propertySchema.OtherData.Add("@xsdType", new Manatee.Json.JsonValue("XmlAttribute"));

                if (attribute.Annotation != null)
                {
                    AddAnnotated(attribute, propertySchema);
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
                    propertySchema.OtherData.Add("const", new Manatee.Json.JsonValue(attribute.FixedValue));
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
                    ParseSimpleType(attribute.SchemaType, propertySchema);
                }

                if (!attribute.SchemaTypeName.IsEmpty)
                {
                    if (propertySchema.Exists(e => "type".Equals(e.Name)))
                    {
                        int d = 0;
                    }

                    propertySchema.Type(JsonSchemaTypeFromString(attribute.SchemaTypeName.Name));
                }

                string name = ObjectName(attribute);
                resultSchema.Property(name, propertySchema);

                if (attribute.Use == XmlSchemaUse.Required)
                {
                    requiredList.Add(name);
                }
            }
        }

        private void AddParticle(XmlSchemaParticle particle, JsonSchema resultSchema, List<string> requiredList)
        {
            if (particle == null)
            {
            }
            else if (particle is XmlSchemaSequence)
            {
                foreach (XmlSchemaParticle item in ((XmlSchemaSequence)particle).Items)
                {
                    AddParticleProperty(item, resultSchema, requiredList);
                }
            }
            else if (particle is XmlSchemaGroupRef)
            {
                ExpandAndCopyGroupRef((XmlSchemaGroupRef)particle, resultSchema, requiredList);
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private void AddParticleProperty(XmlSchemaParticle item, JsonSchema resultSchema, List<string> requiredList)
        {
            if (item is XmlSchemaElement)
            {
                XmlSchemaElement elementItem = (XmlSchemaElement)item;
                ParseElement(elementItem, resultSchema);

                if (item.MinOccurs >= 1)
                {
                    requiredList.Add(ObjectName(elementItem));
                }
            }
            else if (item is XmlSchemaChoice)
            {
                List<JsonSchema> oneOfSchemaList = new List<JsonSchema>();
                foreach (XmlSchemaObject choiceItem in ((XmlSchemaChoice)item).Items)
                {
                    JsonSchema oneOfSchema = new JsonSchema();
                    AddType(choiceItem, oneOfSchema);
                    oneOfSchemaList.Add(oneOfSchema);
                }

                resultSchema.OneOf(oneOfSchemaList.ToArray());
            }
            else if (item is XmlSchemaGroupRef)
            {
                ExpandAndCopyGroupRef((XmlSchemaGroupRef)item, resultSchema, requiredList);
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private void ExpandAndCopyGroupRef(XmlSchemaGroupRef groupRefItem, JsonSchema resultSchema, List<string> requiredList)
        {
            XmlSchemaObject groupObject = FindObject(groupRefItem.RefName.ToString());
            if (groupObject != null)
            {
                if (groupObject is XmlSchemaGroup)
                {
                    AddParticle(((XmlSchemaGroup)groupObject).Particle, resultSchema, requiredList);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }
        }

        private void AddType(XmlSchemaObject item, JsonSchema resultSchema)
        {
            if (item is XmlSchemaElement)
            {
                XmlSchemaElement elementItem = (XmlSchemaElement)item;
                if (elementItem.MaxOccurs > 1)
                {
                    if (resultSchema.Exists(e => "type".Equals(e.Name)))
                    {
                        int d = 0;
                    }

                    resultSchema.Type(JsonSchemaType.Array);
                    resultSchema.MinItems(Convert.ToUInt32(elementItem.MinOccurs));
                    if (!"unbounded".Equals(elementItem.MaxOccursString))
                    {
                        resultSchema.MaxItems(Convert.ToUInt32(elementItem.MaxOccurs));
                    }

                    JsonSchema[] itemsSchemas = new JsonSchema[1];
                    itemsSchemas[0] = new JsonSchema();

                    // AddAnnotation(particle, itemsSchemas[0]);
                    // AddTypeToSchema(schemaType, schemaTypeName, elementName, itemsSchemas[0]);
                    AddTypeFromNameInternal(elementItem.SchemaTypeName, itemsSchemas[0]);
                    resultSchema.Items(itemsSchemas);
                }
                else
                {
                    // AddTypeToSchema(schemaType, schemaTypeName, elementName, propertySchema);
                    AddTypeFromNameInternal(elementItem.SchemaTypeName, resultSchema);
                }

                // string referencedType =
                // AddTypeFromNameInternal(((XmlSchemaElement)item).SchemaTypeName, resultSchema);
                /*
                if (referencedType != null)
                {
                    if (!convertedTypes.Contains(referencedType))
                    {
                        XmlSchemaObject referencedObject = FindObject(referencedType);
                        if (referencedObject is XmlSchemaComplexType)
                        {
                            ParseRootComplexType((XmlSchemaComplexType)referencedObject, resultSchema);
                        }
                        else if (referencedObject is XmlSchemaSimpleType)
                        {
                            ParseRootSimpleType((XmlSchemaSimpleType)referencedObject, resultSchema);
                        }
                        else
                        {
                            throw new NotImplementedException();
                        }
                    }
                }*/
            }
            else if (item is XmlSchemaType)
            {
                ParseSchemaType((XmlSchemaType)item, resultSchema);
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
            else if (item is XmlSchemaGroup)
            {
                throw new NotImplementedException();
            }
            else if (item is XmlSchemaSimpleTypeRestriction)
            {
                AddTypeFromNameInternal(((XmlSchemaSimpleTypeRestriction)item).BaseTypeName, resultSchema);
            }
            else if (item is XmlSchemaSequence)
            {
                List<string> requiredList = new List<string>();
                AddParticle((XmlSchemaSequence)item, resultSchema, requiredList);
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private void AddTypeFromSchemaTypeInternal(XmlSchemaType schemaType, XmlQualifiedName qname, string elementName, JsonSchema resultSchema)
        {
            /*
            if (schemaType != null)
            {
                if (schemaType is XmlSchemaComplexType)
                {
                    string definitionName = (qname != null && qname.ToString().Length > 0) ? qname.ToString() : elementName;
                    resultSchema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + definitionName));
                    if (schemaType is XmlSchemaComplexType)
                    {
                        AddNamedComplexType(mainJsonSchema, (XmlSchemaComplexType)schemaType, definitionName);
                    }

                    anonymousTypes.Add(definitionName);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }
            */
        }

        private string AddTypeFromNameInternal(XmlQualifiedName qname, JsonSchema resultSchema)
        {
            string type = (qname == null) ? null : qname.ToString();
            string name = (qname == null) ? null : qname.Name;
            if ((type == null || type.Length == 0) && (name == null || name.Length == 0))
            {
                throw new ArgumentException();
            }

            if ("http://www.w3.org/2001/XMLSchema:string".Equals(type))
            {
                if (resultSchema.Exists(e => "type".Equals(e.Name)))
                {
                    int d = 0;
                }

                resultSchema.Type(JsonSchemaType.String);
            }
            else if ("http://www.w3.org/2001/XMLSchema:boolean".Equals(type))
            {
                if (resultSchema.Exists(e => "type".Equals(e.Name)))
                {
                    int d = 0;
                }

                resultSchema.Type(JsonSchemaType.Boolean);
            }
            else if ("http://www.w3.org/2001/XMLSchema:integer".Equals(type))
            {
                if (resultSchema.Exists(e => "type".Equals(e.Name)))
                {
                    int d = 0;
                }

                resultSchema.Type(JsonSchemaType.Integer);
            }
            else if ("http://www.w3.org/2001/XMLSchema:decimal".Equals(type))
            {
                if (resultSchema.Exists(e => "type".Equals(e.Name)))
                {
                    int d = 0;
                }

                resultSchema.Type(JsonSchemaType.Number);
            }
            else if ("http://www.w3.org/2001/XMLSchema:date".Equals(type))
            {
                if (resultSchema.Exists(e => "type".Equals(e.Name)))
                {
                    int d = 0;
                }

                resultSchema.Type(JsonSchemaType.String);
                resultSchema.Format(StringFormat.GetFormat("date"));
            }
            else if ("http://www.w3.org/2001/XMLSchema:dateTime".Equals(type))
            {
                if (resultSchema.Exists(e => "type".Equals(e.Name)))
                {
                    int d = 0;
                }

                resultSchema.Type(JsonSchemaType.String);
                resultSchema.Format(StringFormat.DateTime);
            }
            else if ("http://www.w3.org/2001/XMLSchema:gYear".Equals(type))
            {
                if (resultSchema.Exists(e => "type".Equals(e.Name)))
                {
                    int d = 0;
                }

                resultSchema.Type(JsonSchemaType.String);
                resultSchema.Format(StringFormat.GetFormat("year"));
            }
            else if ("http://www.w3.org/2001/XMLSchema:gYearMonth".Equals(type))
            {
                if (resultSchema.Exists(e => "type".Equals(e.Name)))
                {
                    int d = 0;
                }

                resultSchema.Type(JsonSchemaType.String);
                resultSchema.Format(StringFormat.GetFormat("year-month"));
            }
            else
            {
                if (name == null)
                {
                    AddTypeObject(resultSchema);
                }
                else
                {
                    resultSchema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + name));
                    return name;
                }
            }

            return null;
        }

        private void AddSimpleType(XmlSchemaSimpleType simpleType, JsonSchema resultSchema)
        {
            XmlSchemaSimpleTypeContent simpleTypeContent = simpleType.Content;
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
                                resultSchema.MinLength(Convert.ToUInt32(facet.Value));
                            }
                            catch (OverflowException)
                            {
                                resultSchema.MinLength(uint.MinValue);
                            }
                        }
                        else if (facet is XmlSchemaMaxLengthFacet || facet is XmlSchemaMaxInclusiveFacet)
                        {
                            try
                            {
                                resultSchema.MaxLength(Convert.ToUInt32(facet.Value));
                            }
                            catch (OverflowException)
                            {
                                resultSchema.MaxLength(uint.MaxValue);
                            }
                        }
                        else if (facet is XmlSchemaLengthFacet || facet is XmlSchemaTotalDigitsFacet)
                        {
                            try
                            {
                                resultSchema.MinLength(Convert.ToUInt32(facet.Value));
                            }
                            catch (OverflowException)
                            {
                                resultSchema.MinLength(uint.MinValue);
                            }

                            try
                            {
                                resultSchema.MaxLength(Convert.ToUInt32(facet.Value));
                            }
                            catch (OverflowException)
                            {
                                resultSchema.MaxLength(uint.MaxValue);
                            }
                        }
                        else if (facet is XmlSchemaPatternFacet)
                        {
                            resultSchema.Pattern(facet.Value);
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
                        resultSchema.Enum(enumList.ToArray());
                    }
                }

                AddType(simpleTypeRestriction, resultSchema);
            }
        }

        private void AddAnnotated(XmlSchemaAnnotated annotatedItem, JsonSchema resultSchema)
        {
            if (annotatedItem != null)
            {
                AddAnnotation(annotatedItem.Annotation, resultSchema);
            }
        }

        private void AddAnnotation(XmlSchemaAnnotation annotationItem, JsonSchema resultSchema)
        {
            if (annotationItem != null)
            {
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

                if (s.Length != 0)
                {
                    resultSchema.Description(s);
                }
            }
        }

/*
        private void AddDocumentation(XmlSchemaDocumentation item, JsonSchema resultSchema)
        {
            if (annotatedItem != null && annotatedItem.Annotation != null)
            {
                string s = string.Empty;
                foreach (XmlSchemaDocumentation item in annotatedItem.Annotation.Items)
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

                if (s.Length != 0)
                {
                    resultSchema.Description(s);
                }
            }
        }
*/
        private void AddContentModel(XmlSchemaContentModel item, JsonSchema resultSchema)
        {
            if (item is XmlSchemaComplexContent)
            {
                AddComplexContent((XmlSchemaComplexContent)item, resultSchema);
            }
            else if (item is XmlSchemaSimpleContent)
            {
                AddSimpleContent((XmlSchemaSimpleContent)item, resultSchema);
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private void AddComplexContent(XmlSchemaComplexContent item, JsonSchema resultSchema)
        {
            if (item.Annotation != null)
            {
                AddAnnotated(item, resultSchema);
            }

            if (item.Content != null)
            {
                AddContent(item.Content, resultSchema);
            }
        }

        private void AddSimpleContent(XmlSchemaSimpleContent item, JsonSchema resultSchema)
        {
            if (item.Annotation != null)
            {
                AddAnnotated(item, resultSchema);
            }

            if (item.Content != null)
            {
                AddContent(item.Content, resultSchema);
            }
        }

        private void AddContent(XmlSchemaContent item, JsonSchema resultSchema)
        {
            if (item is XmlSchemaSimpleContentExtension)
            {
                XmlSchemaSimpleContentExtension contentExtensionItem = (XmlSchemaSimpleContentExtension)item;
                if (contentExtensionItem.Annotation != null)
                {
                    AddAnnotated(item, resultSchema);
                }

                if (contentExtensionItem.Attributes.Count > 0)
                {
                    List<string> requiredList = new List<string>();
                    AddAttributes(contentExtensionItem.Attributes, resultSchema, requiredList);
                }

                if (!contentExtensionItem.BaseTypeName.IsEmpty)
                {
                    AddTypeFromNameInternal(contentExtensionItem.BaseTypeName, resultSchema);
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
                    AddAnnotated(item, resultSchema);
                }

                if (contentExtensionItem.Attributes.Count > 0)
                {
                    List<string> requiredList = new List<string>();
                    AddAttributes(contentExtensionItem.Attributes, resultSchema, requiredList);
                }

                if (!contentExtensionItem.BaseTypeName.IsEmpty)
                {
                    JsonSchema inheritFromSchema = new JsonSchema();
                    AddTypeFromNameInternal(contentExtensionItem.BaseTypeName, inheritFromSchema);
                    allOfList.Add(inheritFromSchema);
                }

                if (contentExtensionItem.Particle != null)
                {
                    JsonSchema usingSchema = isInherit ? new JsonSchema() : definitionSchema;
                    List<string> requiredList = new List<string>();

                    AddParticle(contentExtensionItem.Particle, usingSchema, requiredList);

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
                    AddTypeObject(resultSchema);
                    resultSchema.AllOf(allOfList.ToArray());
                }

                if (definitionSchema.Count > 0)
                {
                    string name = ObjectName(contentExtensionItem);
                    AddDefinition(resultSchema, ObjectName(contentExtensionItem), definitionSchema);
                }
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private void AddDefinition(JsonSchema resultSchema, string name, JsonSchema definitionSchema)
        {
            if (resultSchema == mainJsonSchema)
            {
                mainJsonSchema.Definition(name, definitionSchema);
            }
            else
            {
                AddTypeObject(resultSchema);
                resultSchema.Property(name, definitionSchema);
            }
        }

        private void AddTypeObject(JsonSchema resultSchema)
        {
            if (!resultSchema.Exists(e => "type".Equals(e.Name)))
            {
                resultSchema.Type(JsonSchemaType.Object);
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

        private string NameOrQualifiedName(string name, XmlQualifiedName qname)
        {
            if (name != null && name.Length > 0)
            {
                return name;
            }

            if (qname != null && !qname.IsEmpty)
            {
                return qname.ToString();
            }

            return null;
        }

        private string ObjectName(XmlSchemaObject item)
        {
            if (item == null)
            {
                return null;
            }

            if (item is XmlSchemaElement)
            {
                XmlSchemaElement elementItem = (XmlSchemaElement)item;
                string name = elementItem.Name;
                if (name == null && elementItem.RefName != null)
                {
                    XmlSchemaObject refObject = FindObject(elementItem.RefName.ToString());
                    name = ObjectName(refObject);
                }

                return name == null ? ObjectName(item.Parent) : name;
            }
            else if (item is XmlSchemaAttribute)
            {
                XmlSchemaAttribute attributeItem = (XmlSchemaAttribute)item;
                string name = attributeItem.Name;
                if (name == null && attributeItem.RefName != null)
                {
                    XmlSchemaObject refObject = FindObject(attributeItem.RefName.ToString());
                    name = ObjectName(refObject);
                }

                return name == null ? ObjectName(item.Parent) : name;
            }
            else if (item is XmlSchemaType)
            {
                string name = ((XmlSchemaType)item).Name;
                return name == null ? ObjectName(item.Parent) : name;
            }
            else if (item is XmlSchemaGroup)
            {
                string name = ((XmlSchemaGroup)item).Name;
                return name == null ? ObjectName(item.Parent) : name;
            }
            else
            {
                return ObjectName(item.Parent);
            }
        }

        private string ObjectNameOrAnonymous(XmlSchemaObject item)
        {
            string anonymousName;
            string tmpName = ObjectName(item);
            if (tmpName == null)
            {
                throw new XmlSchemaException();
            }

            string anonymousNamePart = tmpName.Substring(0, 1).ToUpper() + tmpName.Substring(1);

            int i = 0;
            while (true)
            {
                i++;

                anonymousName = anonymousNamePart;
                if (i > 1)
                {
                    anonymousName += i.ToString();
                }

                // Is name unused?
                if (FindObject(anonymousName) == null && !anonymousTypes.Contains(anonymousName))
                {
                    break;
                }
            }

            if (i != 0)
            {
                anonymousTypes.Add(anonymousName);
            }

            return anonymousName;
        }

        private static void ValidationCallback(object sender, ValidationEventArgs args)
        {
            throw new NotImplementedException();
        }
    }
}
