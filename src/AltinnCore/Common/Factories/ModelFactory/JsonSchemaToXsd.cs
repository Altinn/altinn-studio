using Manatee.Json;
using Manatee.Json.Schema;
using System;
using System.Collections.Generic;
using System.Globalization;
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
            XmlSchemaComplexType rootComplexType = ExtractComplexType(rootComplexTypeName, jSchema);        
            rootElement.Name = "melding";
           
            rootElement.SchemaTypeName = new XmlQualifiedName(rootComplexTypeName);
            xsdSchema.Items.Add(rootElement);
            xsdSchema.Items.Add(rootComplexType);

            foreach (KeyValuePair<string, JsonSchema> def in GetterExtensions.Definitions(jSchema))
            {
                if (def.Value.Properties() != null || def.Value.AllOf() != null)
                {
                    XmlSchemaComplexType complexType = ExtractComplexType(def.Key, def.Value);
                    xsdSchema.Items.Add(complexType);
                } else
                {
                    XmlSchemaSimpleType simpleType = ExtractSimpleType(def.Key, def.Value);
                    xsdSchema.Items.Add(simpleType);                
                }
            
            }

            return xsdSchema;
        }

        private XmlSchemaComplexType ExtractComplexType(string name, JsonSchema def)
        {
            XmlSchemaComplexType complexType = new XmlSchemaComplexType();
 
            complexType.Name = name;

            string abstractType = def.OtherData.TryGetString("@xsdTag");
            if (abstractType != null && abstractType.Equals("abstract"))
            {
                complexType.IsAbstract = true;
            }


            List<JsonSchema> allOf = GetterExtensions.AllOf(def);

            if (allOf != null && allOf.Count > 0)
            {
                XmlSchemaComplexContentExtension extension = new XmlSchemaComplexContentExtension();

                foreach (JsonSchema schema in allOf)
                {
                    string reference = GetterExtensions.Ref(schema);
                    if (reference != null)
                    {                        
                        extension.BaseTypeName = new XmlQualifiedName(ExtractDefinition(reference));
                        XmlSchemaComplexContent content = new XmlSchemaComplexContent();
                        content.Content = extension;                     

                        complexType.ContentModel = content;
                    }
                    else if (schema.Properties() != null)
                    {
                        extension.Particle = ExtractAttrsAndElems(schema, complexType);
                    }                    

                }
                
            } else
            {
                XmlSchemaSequence sequence = ExtractAttrsAndElems(def, complexType);
                
                if (sequence != null && sequence.Items.Count > 0)
                {
                    complexType.Particle = sequence;                    
                }
            }

            return complexType;
        }


        private XmlSchemaSequence ExtractAttrsAndElems(JsonSchema def, XmlSchemaComplexType complexType)
        {
            XmlSchemaSequence sequence = new XmlSchemaSequence();
            foreach (KeyValuePair<string, JsonSchema> property in def.Properties())
            {
                string propertyName = property.Key;
                JsonSchema propertyType = property.Value;

                string xsdType = propertyType.OtherData.TryGetString("@xsdType");
                if (xsdType != null && xsdType.Equals("XmlAttribute"))
                {
                    XmlSchemaSimpleType simpleType = ExtractSimpleType("example", propertyType);
              
                    XmlSchemaAttribute attribute = new XmlSchemaAttribute();
                    attribute.Name = propertyName;
                    attribute.SchemaTypeName = ((XmlSchemaSimpleTypeRestriction) simpleType.Content).BaseTypeName;
                    complexType.Attributes.Add(attribute);

                    JsonValue constant = propertyType.Const();
                    if (constant != null)
                    {
                        if (constant.String != null)
                        {
                            attribute.FixedValue = constant.String;
                        } 
                    }

                }
                else
                {
                    sequence.Items.Add(ExtractElementSequence(propertyName, propertyType, def));
                }
            }
            return sequence;
        }
        

        private XmlSchemaSimpleType ExtractSimpleType(string name, JsonSchema jschema)
        {
            XmlSchemaSimpleType simpleType = new XmlSchemaSimpleType();

            simpleType.Name = name;        

            TypeKeyword type = jschema.Get<TypeKeyword>();

            if (type.Value == JsonSchemaType.String)
            {

                XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction
                {
                    BaseTypeName = new XmlQualifiedName("string", "http://www.w3.org/2001/XMLSchema")
                };

                EnumKeyword enumKeyword = jschema.Get<EnumKeyword>();
                if (enumKeyword != null)
                {

                    foreach (JsonValue enumValue in GetterExtensions.Enum(jschema))
                    {
                        XmlSchemaEnumerationFacet enumFacet = new XmlSchemaEnumerationFacet
                        {
                            Value = enumValue.String
                        };
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

                PatternKeyword pattern = jschema.Get<PatternKeyword>();
                if (pattern != null)
                {
                    XmlSchemaPatternFacet patternFacet = new XmlSchemaPatternFacet();
                    patternFacet.Value = pattern.Value.ToString();

                    content.Facets.Add(patternFacet);
                }

                FormatKeyword format = jschema.Get<FormatKeyword>();
                if (format != null && format.Value != null && format.Value.Key != null && !format.Value.Key.Equals(""))
                {
                    ExtractFormat(content, format);
                }

                simpleType.Content = content;

            }
            else if (type.Value == JsonSchemaType.Number || type.Value == JsonSchemaType.Integer)
            {                
                simpleType.Content = HandleNumberAndInteger(jschema, type);
            }
            else if (type.Value == JsonSchemaType.Boolean)
            {
                XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction();
                content.BaseTypeName = new XmlQualifiedName("boolean", "http://www.w3.org/2001/XMLSchema");
                simpleType.Content = content;
            }           

            return simpleType;
        }

        private static XmlSchemaSimpleTypeRestriction HandleNumberAndInteger(JsonSchema jschema, TypeKeyword type)
        {
            XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction();

            if (type.Value == JsonSchemaType.Number)
            {
                content.BaseTypeName = new XmlQualifiedName("decimal", "http://www.w3.org/2001/XMLSchema");
            }
            else if (type.Value == JsonSchemaType.Integer)
            {
                content.BaseTypeName = new XmlQualifiedName("integer", "http://www.w3.org/2001/XMLSchema");
            }

            double? minValue = GetterExtensions.Minimum(jschema);
            double? minExclusiveValue = GetterExtensions.ExclusiveMinimum(jschema);

            if (minValue != null || minExclusiveValue != null)
            {
                if (minValue != null)
                {
                    double value = (double)minValue;
                    XmlSchemaMinInclusiveFacet facet = new XmlSchemaMinInclusiveFacet
                    {
                        Value = value.ToString("G", CultureInfo.InvariantCulture)
                    };
                    content.Facets.Add(facet);
                }
                else
                {
                    double value = (double)minExclusiveValue;
                    XmlSchemaMinExclusiveFacet facet = new XmlSchemaMinExclusiveFacet
                    {
                        Value = value.ToString("G", CultureInfo.InvariantCulture)
                    };
                    content.Facets.Add(facet);
                }

            }

            double? maxValue = GetterExtensions.Maximum(jschema);
            double? maxExclusiveValue = GetterExtensions.ExclusiveMaximum(jschema);

            if (maxValue != null || maxExclusiveValue != null)
            {
                if (maxValue != null)
                {
                    double value = (double)maxValue;
                    XmlSchemaMaxInclusiveFacet maxInclusiveFacet = new XmlSchemaMaxInclusiveFacet
                    {
                        Value = value.ToString("G", CultureInfo.InvariantCulture)
                    };
                    content.Facets.Add(maxInclusiveFacet);
                }
                else
                {
                    double value = (double)maxExclusiveValue;
                    XmlSchemaMaxExclusiveFacet maxExclusiveFacet = new XmlSchemaMaxExclusiveFacet
                    {
                        Value = value.ToString("G", CultureInfo.InvariantCulture)
                    };
                    content.Facets.Add(maxExclusiveFacet);
                }

            }

            return content;
        }

        private static void ExtractFormat(XmlSchemaSimpleTypeRestriction content, FormatKeyword format)
        {
            switch (format.Value.Key)
            {
                case "date-time":
                    content.BaseTypeName = new XmlQualifiedName("dateTime", "http://www.w3.org/2001/XMLSchema");
                    break;
                case "date":
                    content.BaseTypeName = new XmlQualifiedName("date", "http://www.w3.org/2001/XMLSchema");
                    break;
                case "time":
                    content.BaseTypeName = new XmlQualifiedName("time", "http://www.w3.org/2001/XMLSchema");
                    break;
                case "year-month":
                    content.BaseTypeName = new XmlQualifiedName("gYearMonth", "http://www.w3.org/2001/XMLSchema");
                    break;
                case "year":
                    content.BaseTypeName = new XmlQualifiedName("gYear", "http://www.w3.org/2001/XMLSchema");
                    break;
                case "email":
                    content.BaseTypeName = new XmlQualifiedName("string", "http://www.w3.org/2001/XMLSchema");
                    break;
                case "uri":
                    content.BaseTypeName = new XmlQualifiedName("string", "http://www.w3.org/2001/XMLSchema");
                    break;
            }
        }

        private XmlSchemaElement ExtractElementSequence(string propertyName, JsonSchema propertyType, JsonSchema parentType)
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
                    element.SchemaTypeName = new XmlQualifiedName(ExtractDefinition(typeRef));
                }

            }

            List<string> requiredFields = GetterExtensions.Required(parentType);
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
                element.SchemaTypeName = new XmlQualifiedName(ExtractDefinition(reference));
            }

            return element;            

        }

        private string ExtractDefinition(string refDefinition)
        {
            return refDefinition.Replace("#/definitions/", "");
        }
    }

    
}
