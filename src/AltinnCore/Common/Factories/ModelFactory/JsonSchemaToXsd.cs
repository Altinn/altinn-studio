using Manatee.Json;
using Manatee.Json.Schema;
using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.Xml.Schema;

namespace AltinnCore.Common.Factories.ModelFactory
{
    public class JsonSchemaToXsd
    {
        public XmlSchema CreateXsd(JsonSchema jSchema)
        {
            XmlSchema xsdSchema = new XmlSchema();
            string rootComplexTypeName = GetterExtensions.Title(jSchema);
            XmlSchemaElement rootElement = new XmlSchemaElement();
            XmlSchemaComplexType rootComplexType = extractComplexType(rootComplexTypeName, jSchema);        
            rootElement.Name = "melding";
           
            rootElement.SchemaTypeName = new XmlQualifiedName(rootComplexTypeName);
            xsdSchema.Items.Add(rootElement);
            xsdSchema.Items.Add(rootComplexType);

            foreach (KeyValuePair<string, JsonSchema> def in GetterExtensions.Definitions(jSchema))
            {
                if (def.Value.Properties() != null || def.Value.AllOf() != null)
                {
                    XmlSchemaComplexType complexType = extractComplexType(def.Key, def.Value);
                    xsdSchema.Items.Add(complexType);
                } else
                {
                    XmlSchemaSimpleType simpleType = extractSimpleType(def.Key, def.Value);
                    xsdSchema.Items.Add(simpleType);

                }
            
            }

            return xsdSchema;
        }

        private XmlSchemaComplexType extractComplexType(string name, JsonSchema def)
        {
            XmlSchemaComplexType complexType = new XmlSchemaComplexType();
 
            complexType.Name = name;

            List<JsonSchema> allOf = GetterExtensions.AllOf(def);

            if (allOf != null && allOf.Count > 0)
            {
                XmlSchemaComplexContentExtension extension = new XmlSchemaComplexContentExtension();

                foreach (JsonSchema schema in allOf)
                {
                    string reference = GetterExtensions.Ref(schema);
                    if (reference != null)
                    {                        
                        extension.BaseTypeName = new XmlQualifiedName(extractDefinition(reference));
                        XmlSchemaComplexContent content = new XmlSchemaComplexContent();
                        content.Content = extension;                     

                        complexType.ContentModel = content;
                    }
                    else if (schema.Properties() != null)
                    {
                        extension.Particle = extractAttrsAndElems(schema, complexType);
                    }                    

                }
                
            } else
            {
                XmlSchemaSequence sequence = extractAttrsAndElems(def, complexType);
                
                if (sequence.Items.Count > 0)
                {
                    complexType.Particle = sequence;                    
                }
            }

            return complexType;
        }


        private XmlSchemaSequence extractAttrsAndElems(JsonSchema def, XmlSchemaComplexType complexType)
        {
            XmlSchemaSequence sequence = new XmlSchemaSequence();
            foreach (KeyValuePair<string, JsonSchema> o in def.Properties())
            {

                string xsdType = o.Value.OtherData.TryGetString("@xsdType");
                if (xsdType != null && xsdType.Equals("XmlAttribute"))
                {
                    XmlSchemaSimpleType simpleType = extractSimpleType("example", o.Value);
              
                    XmlSchemaAttribute attribute = new XmlSchemaAttribute();
                    attribute.Name = o.Key;
                    attribute.SchemaTypeName = ((XmlSchemaSimpleTypeRestriction) simpleType.Content).BaseTypeName;
                    complexType.Attributes.Add(attribute);
                }
                else
                {
                    sequence.Items.Add(extractElementSequence(o.Key, o.Value));
                }
            }
            return sequence;
        }
        

        private XmlSchemaSimpleType extractSimpleType(string name, JsonSchema jschema)
        {
            XmlSchemaSimpleType simpleType = new XmlSchemaSimpleType();

            simpleType.Name = name;        

            TypeKeyword type = jschema.Get<TypeKeyword>();

            if (type.Value == JsonSchemaType.String)
            {
                
                XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction();

                content.BaseTypeName = new XmlQualifiedName("string", "http://www.w3.org/2001/XMLSchema");

                EnumKeyword enumKeyword = jschema.Get<EnumKeyword>();
                if (enumKeyword != null)
                {

                    foreach (JsonValue enumValue in GetterExtensions.Enum(jschema))
                    {
                        XmlSchemaEnumerationFacet enumFacet = new XmlSchemaEnumerationFacet();
                        enumFacet.Value = enumValue.String;
                        content.Facets.Add(enumFacet);
                    }
                }
                

                MinLengthKeyword minLength = jschema.Get<MinLengthKeyword>();
                if (minLength != null)
                {
                    XmlSchemaMinLengthFacet minInclusive = new XmlSchemaMinLengthFacet();
                    minInclusive.Value = minLength.Value.ToString();
                    content.Facets.Add(minInclusive);
                }

                MaxLengthKeyword maxLength = jschema.Get<MaxLengthKeyword>();
                if (maxLength != null)
                {
                    XmlSchemaMaxLengthFacet maxInclusive = new XmlSchemaMaxLengthFacet();
                    maxInclusive.Value = maxLength.Value.ToString();
                    content.Facets.Add(maxInclusive);
                }

                simpleType.Content = content;

            }
            else if (type.Value == JsonSchemaType.Number)
            {
                XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction();
                content.BaseTypeName = new XmlQualifiedName("decimal", "http://www.w3.org/2001/XMLSchema");
                simpleType.Content = content;
            }
            else if (type.Value == JsonSchemaType.Integer)
            {
                XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction();
                content.BaseTypeName = new XmlQualifiedName("integer", "http://www.w3.org/2001/XMLSchema");            
                simpleType.Content = content;
            }
            else if (type.Value == JsonSchemaType.Boolean)
            {
                XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction();
                content.BaseTypeName = new XmlQualifiedName("boolean", "http://www.w3.org/2001/XMLSchema");
                simpleType.Content = content;

            }

            return simpleType;
        }

        private XmlSchemaElement extractElementSequence(string propertyName, JsonSchema propertyType)
        {                                                
            XmlSchemaElement element = new XmlSchemaElement();

            element.Name = propertyName;

            List<JsonSchema> items = GetterExtensions.Items(propertyType);
            if (items != null && items.Count > 0)
            {
                double? minItems = GetterExtensions.MinItems(propertyType);
                double? maxItems = GetterExtensions.MaxItems(propertyType);

                if (minItems != null)
                {
                    element.MinOccurs = (decimal)minItems;
                }

                if (maxItems != null && maxItems < 999)
                {
                    element.MaxOccurs = (decimal)maxItems;
                }
                else
                {
                    element.MaxOccursString = "unbounded";
                }

                foreach (JsonSchema schema in items)
                {
                    string typeRef = GetterExtensions.Ref(schema);
                    element.SchemaTypeName = new XmlQualifiedName(extractDefinition(typeRef));
                }

            }

            List<string> requiredFields = GetterExtensions.Required(propertyType);
            if (requiredFields != null && requiredFields.Contains(propertyName))
            {
                //element.MinOccurs = 1;
            } else
            {
                element.MinOccurs = 0;
                element.IsNillable = true;
            }
            string reference = GetterExtensions.Ref(propertyType);
            if (reference != null)
            {
                element.SchemaTypeName = new XmlQualifiedName(extractDefinition(reference));
            }

            return element;            

        }

        private string extractDefinition(string refDefinition)
        {
            return refDefinition.Replace("#/definitions/", "");
        }
    }

    
}
