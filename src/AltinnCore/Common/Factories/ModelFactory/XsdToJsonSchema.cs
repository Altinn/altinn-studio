using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.Xml.Schema;

namespace AltinnCore.Common.Factories.ModelFactory
{
    public class XsdToJsonSchema
    {
        private XmlReader xsdReader;
        private XmlSchema mainXsd;
        private JsonSchema mainJsonSchema;

        private List<string> anonymousTypes = new List<string>();

        public XsdToJsonSchema(XmlReader xsdReader)
        {
            this.xsdReader = xsdReader;
        }

        public JsonValue asJsonSchema()
        {
            mainJsonSchema = new JsonSchema();
            mainJsonSchema.OtherData.Add("$schema", new Manatee.Json.JsonValue("http://json-schema.org/schema#"));
            mainJsonSchema.OtherData.Add("$id", new Manatee.Json.JsonValue(Guid.NewGuid().ToString()));

            mainXsd = XmlSchema.Read(xsdReader, ValidationCallback);

            convertXSDtoJsonSchema();

            return new JsonSerializer().Serialize<JsonSchema>(mainJsonSchema);
        }

        private void convertXSDtoJsonSchema()
        {
            bool first = true;

            XmlSchemaObjectEnumerator enumerator = mainXsd.Items.GetEnumerator();
            while (enumerator.MoveNext())
            {
                XmlSchemaObject xmlSchemaObject = enumerator.Current;

                if (xmlSchemaObject is XmlSchemaElement)
                {
                    XmlSchemaElement xmlSchemaElement = (XmlSchemaElement)xmlSchemaObject;
                    if (xmlSchemaElement.Parent == null || (xmlSchemaElement.Parent == mainXsd && first))
                    {
                        mainJsonSchema.Title(xmlSchemaElement.Name);
                        mainJsonSchema.Type(JsonSchemaType.Object);
                        addAnnotation(xmlSchemaElement, mainJsonSchema);

                        JsonSchema objectRefSchema = new JsonSchema();
                        addTypeToSchema(xmlSchemaElement.SchemaType, xmlSchemaElement.SchemaTypeName, objectRefSchema);
                        mainJsonSchema.Property(xmlSchemaElement.Name, objectRefSchema);

                        mainJsonSchema.Required(xmlSchemaElement.Name);

                        first = false;
                    }
                    else
                    {
                        addTypeToSchema(xmlSchemaElement.SchemaType, xmlSchemaElement.SchemaTypeName, mainJsonSchema);
                    }
                }
                else if (xmlSchemaObject is XmlSchemaComplexType)
                {
                    addComplexType(mainJsonSchema, (XmlSchemaComplexType)xmlSchemaObject);
                }
                else if (xmlSchemaObject is XmlSchemaSimpleType)
                {
                    XmlSchemaSimpleType simpleType = (XmlSchemaSimpleType)xmlSchemaObject;

                    JsonSchema definitionSchema = new JsonSchema();
                    addSimpleTypeToDefinition(simpleType, definitionSchema);
                    addAnnotation(simpleType, definitionSchema);
                    mainJsonSchema.Definition(simpleType.Name, definitionSchema);
                }
                else if (xmlSchemaObject is XmlSchemaGroup)
                {
                }
                else
                {
                    throw new NotImplementedException();
                }
            }
        }

        private JsonSchemaType jsonSchemaTypeFromString(string type)
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

        private void addComplexType(JsonSchema jsonSchema, XmlSchemaComplexType complexType)
        {
            addNamedComplexType(jsonSchema, complexType, complexType.Name);
        }

        private void addNamedComplexType(JsonSchema jsonSchema, XmlSchemaComplexType complexType, string name)
        {
            JsonSchema definitionSchema = new JsonSchema();
            addAnnotation(complexType, definitionSchema);

            if (complexType.ContentModel != null)
            {
                if (complexType.ContentModel is XmlSchemaComplexContent)
                {
                    XmlSchemaComplexContent complexContent = (XmlSchemaComplexContent)complexType.ContentModel;
                    addComplexContent(complexContent, definitionSchema);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }
            List<string> requiredList = new List<string>();
            foreach (XmlSchemaAttribute attribute in complexType.Attributes)
            {
                JsonSchema propertySchema = new JsonSchema();
                propertySchema.OtherData.Add("@xsdType", new Manatee.Json.JsonValue("XmlAttribute"));
                addAnnotation(attribute, propertySchema);
                propertySchema.Type(jsonSchemaTypeFromString(attribute.SchemaTypeName.Name));
                if (attribute.FixedValue != null)
                {
                    propertySchema.OtherData.Add("const", new Manatee.Json.JsonValue(attribute.FixedValue));
                }
                definitionSchema.Property(attribute.Name, propertySchema);

                if (attribute.Use == XmlSchemaUse.Required)
                {
                    requiredList.Add(attribute.Name);
                }
            }

            addParticle(complexType.Particle, definitionSchema, requiredList);

            if (requiredList.Count > 0)
            {
                definitionSchema.Required(requiredList.ToArray());
            }

            jsonSchema.Definition(name, definitionSchema);
        }

        private void addComplexContent(XmlSchemaComplexContent complexContent, JsonSchema definitionSchema)
        {
            definitionSchema.Type(JsonSchemaType.Object);
            List<JsonSchema> allOfSchemaList = new List<JsonSchema>();

            if (complexContent.Content != null)
            {
                if (complexContent.Content is XmlSchemaComplexContentExtension)
                {
                    XmlSchemaComplexContentExtension contentExtension = (XmlSchemaComplexContentExtension)complexContent.Content;

                    JsonSchema allOfSchema;

                    if (contentExtension.BaseTypeName != null)
                    {
                        allOfSchema = new JsonSchema();
                        addTypeToSchema(null, contentExtension.BaseTypeName, allOfSchema);
                        allOfSchemaList.Add(allOfSchema);
                    }

                    allOfSchema = new JsonSchema();
                    addAnnotation(contentExtension, allOfSchema);

                    List<string> requiredList = new List<string>();
                    addParticle(contentExtension.Particle, allOfSchema, requiredList);
                    if (requiredList.Count > 0)
                    {
                        allOfSchema.Required(requiredList.ToArray());
                    }
                    allOfSchemaList.Add(allOfSchema);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }
            else
            {
                throw new NotImplementedException();
            }

            definitionSchema.AllOf(allOfSchemaList.ToArray());
        }

        private void addParticle(XmlSchemaParticle particle, JsonSchema definitionSchema, List<string> requiredList)
        {
            if (particle == null)
            {
            }
            else if (particle is XmlSchemaSequence)
            {
                foreach (XmlSchemaParticle item in ((XmlSchemaSequence)particle).Items)
                {
                    addParticleProperty(item, definitionSchema, requiredList);
                }
            }
            else if (particle is XmlSchemaGroupRef)
            {
                addGroupRefToDefinition(definitionSchema, requiredList, (XmlSchemaGroupRef)particle);
            }
            else
            {
                throw new NotImplementedException();
            }
        }

        private void addParticleProperty(XmlSchemaParticle item, JsonSchema definitionSchema, List<string> requiredList)
        {
            if (item is XmlSchemaElement)
            {
                XmlSchemaElement elementItem = (XmlSchemaElement)item;

                JsonSchema propertySchema = new JsonSchema();
                addAnnotation(elementItem, propertySchema);
                if (elementItem.SchemaTypeName != null && !elementItem.SchemaTypeName.IsEmpty)
                {
                    addTypeToProperty(item, propertySchema, elementItem.SchemaType, elementItem.SchemaTypeName);
                }
                else if (elementItem.SchemaType != null)
                {
                    if (elementItem.SchemaType is XmlSchemaComplexType)
                    {
                        XmlSchemaComplexType complexType = (XmlSchemaComplexType)elementItem.SchemaType;
                        string anonymousNamePart = elementItem.Name.Substring(0, 1).ToUpper() + elementItem.Name.Substring(1);
                        string anonymousName;
                        int i = 0;
                        while (true)
                        {
                            i++;

                            anonymousName = anonymousNamePart;
                            if (i > 1)
                            {
                                anonymousName += i.ToString();
                            }
                            if (findObject(anonymousName) == null && !anonymousTypes.Contains(anonymousName)) //Is name unused?
                            {
                                break;
                            }
                        }

                        addTypeToSchema(elementItem.SchemaType, new XmlQualifiedName(anonymousName), propertySchema);
                        addNamedComplexType(mainJsonSchema, complexType, anonymousName);
                        anonymousTypes.Add(anonymousName);
                    }
                    else
                    {
                        throw new NotImplementedException();
                    }
                }
                definitionSchema.Property(elementItem.Name, propertySchema);

                if (item.MinOccurs >= 1)
                {
                    requiredList.Add(elementItem.Name);
                }
            }
            else if (item is XmlSchemaGroupRef)
            {
                addGroupRefToDefinition(definitionSchema, requiredList, (XmlSchemaGroupRef)item);
            }
        }

        private void addGroupRefToDefinition(JsonSchema definitionSchema, List<string> requiredList, XmlSchemaGroupRef groupRefItem)
        {
            XmlSchemaObject groupObject = findObject(groupRefItem.RefName.ToString());
            if (groupObject != null)
            {
                if (groupObject is XmlSchemaGroup)
                {
                    addParticle(((XmlSchemaGroup)groupObject).Particle, definitionSchema, requiredList);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }
        }

        private void addSimpleTypeToDefinition(XmlSchemaSimpleType simpleType, JsonSchema definitionSchema)
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
                        else if (facet is XmlSchemaMinLengthFacet)
                        {
                            definitionSchema.MinLength(Convert.ToUInt32(facet.Value));
                        }
                        else if (facet is XmlSchemaMaxLengthFacet)
                        {
                            definitionSchema.MaxLength(Convert.ToUInt32(facet.Value));
                        }
                        else
                        {
                            throw new NotImplementedException();
                        }
                    }

                    if (enumList.Count > 0)
                    {
                        definitionSchema.Enum(enumList.ToArray());
                    }
                }
                addTypeToSchema(simpleTypeRestriction.BaseType, simpleTypeRestriction.BaseTypeName, definitionSchema);
            }
        }

        private void addTypeToProperty(XmlSchemaParticle particle, JsonSchema propertySchema, XmlSchemaType schemaType, XmlQualifiedName schemaTypeName)
        {
            if (particle.MaxOccurs > 1)
            {
                propertySchema.Type(JsonSchemaType.Array);
                propertySchema.MinItems(Convert.ToUInt32(particle.MinOccurs));
                if (!"unbounded".Equals(particle.MaxOccursString))
                {
                    propertySchema.MaxItems(Convert.ToUInt32(particle.MaxOccurs));
                }

                JsonSchema[] itemsSchemas = new JsonSchema[1];
                itemsSchemas[0] = new JsonSchema();
                addAnnotation(particle, itemsSchemas[0]);
                addTypeToSchema(schemaType, schemaTypeName, itemsSchemas[0]);
                propertySchema.Items(itemsSchemas);
            }
            else
            {
                addTypeToSchema(schemaType, schemaTypeName, propertySchema);
            }
        }

        private void addTypeToSchema(XmlSchemaType schemaType, XmlQualifiedName qName, JsonSchema schema)
        {
            if (schemaType != null)
            {
                if (schemaType is XmlSchemaComplexType)
                {
                    schema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + qName.Name));
                    anonymousTypes.Add(qName.Name);
                }
                else
                {
                    throw new NotImplementedException();
                }
            }
            else
            {
                string type = (qName == null) ? null : qName.ToString();
                string name = (qName == null) ? null : qName.Name;
                if ((type == null || type.Length == 0) && (name == null || name.Length == 0))
                {
                    throw new ArgumentException();
                }

                if ("http://www.w3.org/2001/XMLSchema:string".Equals(type))
                {
                    schema.Type(JsonSchemaType.String);
                }
                else if ("http://www.w3.org/2001/XMLSchema:boolean".Equals(type))
                {
                    schema.Type(JsonSchemaType.Boolean);
                }
                else if ("http://www.w3.org/2001/XMLSchema:integer".Equals(type))
                {
                    schema.Type(JsonSchemaType.Integer);
                }
                else if ("http://www.w3.org/2001/XMLSchema:decimal".Equals(type))
                {
                    schema.Type(JsonSchemaType.Number);
                }
                else if ("http://www.w3.org/2001/XMLSchema:date".Equals(type))
                {
                    schema.Type(JsonSchemaType.String);
                    schema.Format(new StringFormat("date", JsonSchemaVersion.All, null));
                }
                else if ("http://www.w3.org/2001/XMLSchema:dateTime".Equals(type))
                {
                    schema.Type(JsonSchemaType.String);
                    schema.Format(StringFormat.DateTime);
                }
                else if ("http://www.w3.org/2001/XMLSchema:gYear".Equals(type))
                {
                    schema.Type(JsonSchemaType.String);
                    schema.Format(new StringFormat("year", JsonSchemaVersion.All, null));
                }
                else if ("http://www.w3.org/2001/XMLSchema:gYearMonth".Equals(type))
                {
                    schema.Type(JsonSchemaType.String);
                    schema.Format(new StringFormat("year-month", JsonSchemaVersion.All, null));
                }
                else
                {
                    if (name == null)
                    {
                        schema.Type(JsonSchemaType.Object);
                    }
                    else
                    {
                        schema.OtherData.Add("$ref", new Manatee.Json.JsonValue("#/definitions/" + name));
                    }
                }
            }
        }

        private void addAnnotation(XmlSchemaAnnotated annotated, JsonSchema jsonSchema)
        {
            if (annotated != null && annotated.Annotation != null)
            {
                foreach (XmlSchemaDocumentation item in annotated.Annotation.Items)
                {
                    String s = "";
                    foreach (XmlNode markup in item.Markup)
                    {
                        s += markup.Value;
                    }
                    jsonSchema.Description(s);
                }
            }

        }

        private XmlSchemaObject findObject(string name)
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

                if (name.Equals(objectName))
                {
                    return xmlSchemaObject;
                }
            }
            return null;
        }

        private static void ValidationCallback(object sender, ValidationEventArgs args)
        {
            throw new NotImplementedException();
        }
    }
}
