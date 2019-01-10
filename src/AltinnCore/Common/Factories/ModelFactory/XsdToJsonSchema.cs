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

        private IList<string> anonymousTypes = new List<string>();
        private IDictionary<string, JsonSchema> definitionItems = new Dictionary<string, JsonSchema>();

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

            List<string> requiredList = new List<string>();
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
                        string name = ObjectName(item);
                        mainJsonSchema.Property(name, itemSchema);
                        if (isRequired)
                        {
                            requiredList.Add(name);
                        }
                    }
                }
            }

            if (requiredList.Count > 0)
            {
                mainJsonSchema.Required(requiredList.ToArray());
            }

            enumerator = mainXsd.Items.GetEnumerator();
            while (enumerator.MoveNext())
            {
                XmlSchemaObject item = enumerator.Current;

                bool isRequired;
                JsonSchema itemSchema = Parse(item, out isRequired);
                if (itemSchema != null)
                {
                    mainJsonSchema.Definition(ObjectName(item), itemSchema);
                }
            }

            return new JsonSerializer().Serialize<JsonSchema>(mainJsonSchema);
        }

        private JsonSchema Parse(XmlSchemaObject item, out bool isRequired)
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
            else
            {
                int d = 0;
                isRequired = false;
                return null;

                // throw new NotImplementedException();
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
            isRequired = false;

            JsonSchema elementSchema = new JsonSchema();

            bool isTopLevel = item.Parent == mainXsd;
            if (!isFirstPass && isTopLevel)
            {
                return null;
            }

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

            if (item.MinOccursString != null)
            {
                isRequired = true;
            }

            if (item.MaxOccursString != null)
            {
                int d = 0;
            }

            if (!item.RefName.IsEmpty)
            {
                XmlSchemaObject refObject = FindObject(item.RefName.ToString());
                elementSchema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + ObjectName(refObject)));
            }

            if (item.SchemaType != null)
            {
                if (isFirstPass)
                {
                    string schemaTypeName = ObjectName(item.SchemaType);
                    elementSchema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + schemaTypeName));
                }
                else
                {
                    /*
                    // definitionName = item.Name;
                    if (item.SchemaType is XmlSchemaComplexType)
                    {
                        XmlSchemaComplexType complexType = (XmlSchemaComplexType)item.SchemaType;
                        schemaTypeSchema = new JsonSchema();
                        schemaTypeName = ObjectName(complexType);
                        AddType(item.SchemaType, schemaTypeSchema);

                        // AddNamedComplexType(mainJsonSchema, complexType, anonymousName);
                        // anonymousTypes.Add(anonymousName);
                    }
                    else
                    {
                        throw new NotImplementedException();
                    }
                    */
                    int d = 0;
                }
            }

            if (!item.SchemaTypeName.IsEmpty)
            {
                if (isFirstPass)
                {
                    elementSchema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + item.SchemaTypeName.ToString()));
                }
                else
                {
                    /*
                    schemaTypeSchema = new JsonSchema();
                    schemaTypeName = item.SchemaTypeName.ToString();
                    AddType(item, schemaTypeSchema);
                    */
                    int d = 0;
                }
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
/*
            if (schemaTypeSchema == null)
            {
                string name = ObjectName(item);
                if (item.Parent == mainXsd)
                {
                    AddAsRootProperty(name, elementSchema);
                }

                AddDefinition(resultSchema, name, elementSchema);
            }
            else
            {
                if (item.Parent == mainXsd)
                {
                    elementSchema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + schemaTypeName));
                    AddAsRootProperty(ObjectName(item), elementSchema);
                }

                AddDefinition(resultSchema, schemaTypeName, schemaTypeSchema);
            }
*/
            /*}
            else
            {
                resultSchema.Property(ObjectNameOrAnonymous(item), definitionSchema);
            }*/
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
                        string name = ObjectName(attribute);
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
                int d = 0;

                // throw new NotImplementedException();

                // AddContentModel(item.ContentModel, complexTypeSchema);
            }

            if (item.Particle != null)
            {
                int d = 0;

                // throw new NotImplementedException();

                // AddParticle(item.Particle, complexTypeSchema, requiredList);
            }

            if (requiredList.Count > 0)
            {
                complexTypeSchema.Required(requiredList.ToArray());
            }

            return complexTypeSchema;
        }

        private JsonSchema ParseSimpleType(XmlSchemaSimpleType item)
        {
            JsonSchema simpleTypeSchema = new JsonSchema();

            if (item.Annotation != null)
            {
                string annotation = ParseAnnotated(item);
                if (annotation != null && annotation.Length > 0)
                {
                    simpleTypeSchema.Description(annotation);
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
                throw new NotImplementedException();

                // AddSimpleType(item, simpleTypeSchema);
            }

            if (item.Datatype != null)
            {
                throw new NotImplementedException();
            }

            return simpleTypeSchema;
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
                throw new NotImplementedException();

                // AddDefinition(attributeSchema, ObjectName(attribute.SchemaType), ParseSimpleType(attribute.SchemaType));
            }

            if (!attribute.SchemaTypeName.IsEmpty)
            {
                attributeSchema.Type(JsonSchemaTypeFromString(attribute.SchemaTypeName.Name));
            }

            if (attribute.Use == XmlSchemaUse.Required)
            {
                isRequired = true;
            }

            return attributeSchema;
        }

        /*
         *
         *
         *
         *
         *
         *
         *
         *
         *
         *
         *
         *
         *
         *
         *
         *
         *
         */

        private void AddAsRootProperty(string name, JsonSchema propertySchema)
        {
            // JsonSchema propertySchema = new JsonSchema();
            // string propertyName = NameOrQualifiedName(null, itemElement.SchemaTypeName);
            // propertySchema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + propertyName));
            // mainJsonSchema.Property(itemElement.Name, propertySchema);
            mainJsonSchema.Property(name, propertySchema);
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
                throw new NotImplementedException();
                /*
                XmlSchemaElement elementItem = (XmlSchemaElement)item;
                ParseElement(elementItem, resultSchema);

                if (item.MinOccurs >= 1)
                {
                    requiredList.Add(ObjectName(elementItem));
                }
                */
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
                string annotated = ParseAnnotated(item);
                if (annotated != null && annotated.Length > 0)
                {
                    resultSchema.Description(annotated);
                }
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
                string annotated = ParseAnnotated(item);
                if (annotated != null && annotated.Length > 0)
                {
                    resultSchema.Description(annotated);
                }
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
                    string annotated = ParseAnnotated(item);
                    if (annotated != null && annotated.Length > 0)
                    {
                        resultSchema.Description(annotated);
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
                            string name = ObjectName(attribute);
                            resultSchema.Property(name, attributeSchema);
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
                    string annotated = ParseAnnotated(item);
                    if (annotated != null && annotated.Length > 0)
                    {
                        resultSchema.Description(annotated);
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
                            string name = ObjectName(attribute);
                            resultSchema.Property(name, attributeSchema);
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
