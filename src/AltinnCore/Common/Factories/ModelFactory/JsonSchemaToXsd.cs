using System;
using System.Collections.Generic;
using System.Globalization;
using System.Xml;
using System.Xml.Schema;
using Manatee.Json;
using Manatee.Json.Schema;

namespace AltinnCore.Common.Factories.ModelFactory
{
    /// <summary>
    ///     Utility class for converting JSON Schema to Xsd
    /// </summary>
    public class JsonSchemaToXsd
    {
        private const string XmlSchemaNamespace = "http://www.w3.org/2001/XMLSchema";
        private const int MagicNumberMaxOccurs = 999;

        /// <summary>
        ///       Creates a XML schema object from the JSON Schema
        /// </summary>
        /// <param name="jSchema">bla bla</param>
        /// <returns>xmlschema</returns>
        public XmlSchema CreateXsd(JsonSchema jSchema)
        {
            XmlSchema xsdSchema = new XmlSchema
            {
                ElementFormDefault = XmlSchemaForm.Qualified,
                AttributeFormDefault = XmlSchemaForm.Unqualified,
            };

            string title = GetterExtensions.Title(jSchema);

            XmlSchemaElement rootElement = new XmlSchemaElement
            {
                Name = title,
            };

            rootElement.SchemaTypeName = new XmlQualifiedName(title);

            xsdSchema.Items.Add(rootElement);

            // handle properties of root object type
            ExtractProperties(xsdSchema, title, jSchema);                                  

            // Handle all definitions
            foreach (KeyValuePair<string, JsonSchema> def in GetterExtensions.Definitions(jSchema))
            {
                ExtractProperties(xsdSchema, def.Key, def.Value);
            }

            return xsdSchema;
        }

        private void ExtractProperties(XmlSchema xsdSchema, string name, JsonSchema jSchema)
        {
            if (jSchema.Properties() != null || jSchema.AllOf() != null)
            {
                XmlSchemaComplexType complexType = ExtractComplexType(name, jSchema);
                xsdSchema.Items.Add(complexType);
            }
            else
            {
                XmlSchemaSimpleType simpleType = ExtractSimpleType(name, jSchema);
                xsdSchema.Items.Add(simpleType);
            }
        }

        private XmlSchemaComplexType ExtractComplexType(string name, JsonSchema type)
        {
            XmlSchemaComplexType complexType = new XmlSchemaComplexType
            {
                Name = name,
            };

            string abstractType = type.OtherData.TryGetString("@xsdTag");
            if (abstractType != null && abstractType.Equals("abstract"))
            {
                complexType.IsAbstract = true;
            }

            List<JsonSchema> allOf = GetterExtensions.AllOf(type);

            if (allOf != null && allOf.Count > 0)
            {
                XmlSchemaComplexContentExtension extension = new XmlSchemaComplexContentExtension();

                foreach (JsonSchema schema in allOf)
                {
                    string reference = GetterExtensions.Ref(schema);
                    if (reference != null)
                    {                        
                        extension.BaseTypeName = new XmlQualifiedName(ExtractTypeFromDefinitionReference(reference));
                        XmlSchemaComplexContent content = new XmlSchemaComplexContent
                        {
                            Content = extension,
                        };

                        complexType.ContentModel = content;
                    }
                    else if (schema.Properties() != null)
                    {
                        extension.Particle = ExtractAttributesAndElements(schema, complexType);
                    }                    
                }
            }
          else
            {
                XmlSchemaSequence sequence = ExtractAttributesAndElements(type, complexType);
                
                if (sequence != null && sequence.Items.Count > 0)
                {
                    complexType.Particle = sequence;                    
                }
            }

            return complexType;
        }

        private XmlSchemaSequence ExtractAttributesAndElements(JsonSchema jSchema, XmlSchemaComplexType complexType)
        {
            XmlSchemaSequence sequence = new XmlSchemaSequence();
            foreach (KeyValuePair<string, JsonSchema> property in jSchema.Properties())
            {
                string propertyName = property.Key;
                JsonSchema propertyType = property.Value;

                string xsdType = propertyType.OtherData.TryGetString("@xsdType");
                if (xsdType != null && xsdType.Equals("XmlAttribute"))
                {
                    XmlSchemaSimpleType simpleType = ExtractSimpleType("example", propertyType);

                    XmlSchemaAttribute attribute = new XmlSchemaAttribute
                    {
                        Name = propertyName,
                        SchemaTypeName = ((XmlSchemaSimpleTypeRestriction)simpleType.Content).BaseTypeName,
                    };
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
                    sequence.Items.Add(ExtractElementSequence(propertyName, propertyType, jSchema));
                }
            }

            return sequence;
        }        

        private XmlSchemaSimpleType ExtractSimpleType(string name, JsonSchema jSchema)
        {
            XmlSchemaSimpleType simpleType = new XmlSchemaSimpleType
            {
                Name = name,
            };

            string reference = GetterExtensions.Ref(jSchema);
            if (reference != null)
            {
                XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction
                {
                    BaseTypeName = new XmlQualifiedName(ExtractTypeFromDefinitionReference(reference)),
                };
                
                simpleType.Content = content;

                return simpleType;
            }

            TypeKeyword type = jSchema.Get<TypeKeyword>();

            if (type == null)
            {
                throw new ApplicationException("Empty type definition for property named " + name + ". Unable to map it to XSD");
            }

            if (type.Value == JsonSchemaType.String)
            {
                simpleType.Content = ExtractStringFacets(jSchema);
            }
            else if (type.Value == JsonSchemaType.Number || type.Value == JsonSchemaType.Integer)
            {                
                simpleType.Content = ExtractNumberAndIntegerFacets(jSchema, type);
            }
            else if (type.Value == JsonSchemaType.Boolean)
            {
                XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction
                {
                    BaseTypeName = new XmlQualifiedName("boolean", XmlSchemaNamespace),
                };
                simpleType.Content = content;
            }           

            return simpleType;
        }

        private XmlSchemaSimpleTypeRestriction ExtractStringFacets(JsonSchema jSchema)
        {
            XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction
            {
                BaseTypeName = new XmlQualifiedName("string", XmlSchemaNamespace),
            };

            EnumKeyword enumKeyword = jSchema.Get<EnumKeyword>();
            if (enumKeyword != null)
            {
                foreach (JsonValue enumValue in GetterExtensions.Enum(jSchema))
                {
                    XmlSchemaEnumerationFacet enumFacet = new XmlSchemaEnumerationFacet
                    {
                        Value = enumValue.String,
                    };
                    content.Facets.Add(enumFacet);
                }
            }

            MinLengthKeyword minLength = jSchema.Get<MinLengthKeyword>();
            if (minLength != null)
            {
                XmlSchemaMinLengthFacet minInclusive = new XmlSchemaMinLengthFacet
                {
                    Value = minLength.Value.ToString(),
                };
                content.Facets.Add(minInclusive);
            }

            MaxLengthKeyword maxLength = jSchema.Get<MaxLengthKeyword>();
            if (maxLength != null)
            {
                XmlSchemaMaxLengthFacet maxInclusive = new XmlSchemaMaxLengthFacet
                {
                    Value = maxLength.Value.ToString(),
                };
                content.Facets.Add(maxInclusive);
            }

            PatternKeyword pattern = jSchema.Get<PatternKeyword>();
            if (pattern != null)
            {
                XmlSchemaPatternFacet patternFacet = new XmlSchemaPatternFacet
                {
                    Value = pattern.Value.ToString(),
                };

                content.Facets.Add(patternFacet);
            }

            FormatKeyword format = jSchema.Get<FormatKeyword>();
            if (format != null && format.Value != null && !string.IsNullOrEmpty(format.Value.Key))
            {
                content.BaseTypeName = ExtractBaseTypeNameFromFormat(format.Value.Key);
            }

            return content;
        }

        private static XmlSchemaSimpleTypeRestriction ExtractNumberAndIntegerFacets(JsonSchema jSchema, TypeKeyword type)
        {
            XmlSchemaSimpleTypeRestriction content = new XmlSchemaSimpleTypeRestriction();

            if (type.Value == JsonSchemaType.Number)
            {
                content.BaseTypeName = new XmlQualifiedName("decimal", XmlSchemaNamespace);
            }
            else if (type.Value == JsonSchemaType.Integer)
            {
                content.BaseTypeName = new XmlQualifiedName("integer", XmlSchemaNamespace);
            }

            double? minValue = GetterExtensions.Minimum(jSchema);
            double? minExclusiveValue = GetterExtensions.ExclusiveMinimum(jSchema);

            if (minValue != null || minExclusiveValue != null)
            {
                if (minValue != null)
                {
                    XmlSchemaMinInclusiveFacet facet = new XmlSchemaMinInclusiveFacet
                    {
                        Value = FormatDouble((double)minValue),
                    };
                    content.Facets.Add(facet);
                }
                else
                {                    
                    XmlSchemaMinExclusiveFacet facet = new XmlSchemaMinExclusiveFacet
                    {
                        Value = FormatDouble((double)minExclusiveValue),
                    };
                    content.Facets.Add(facet);
                }
            }

            double? maxValue = GetterExtensions.Maximum(jSchema);
            double? maxExclusiveValue = GetterExtensions.ExclusiveMaximum(jSchema);

            if (maxValue != null || maxExclusiveValue != null)
            {
                if (maxValue != null)
                {                    
                    XmlSchemaMaxInclusiveFacet maxInclusiveFacet = new XmlSchemaMaxInclusiveFacet
                    {
                        Value = FormatDouble((double)maxValue),
                    };
                    content.Facets.Add(maxInclusiveFacet);
                }
                else
                {                    
                    XmlSchemaMaxExclusiveFacet maxExclusiveFacet = new XmlSchemaMaxExclusiveFacet
                    {
                        Value = FormatDouble((double)maxExclusiveValue),
                    };
                    content.Facets.Add(maxExclusiveFacet);
                }
            }

            return content;
        }

        private static string FormatDouble(double value)
        {
            return value.ToString("G", CultureInfo.InvariantCulture);
        }

        private XmlQualifiedName ExtractBaseTypeNameFromFormat(string format)
        {
            switch (format)
            {                    
                case "date":
                    return new XmlQualifiedName("date", XmlSchemaNamespace);

                case "date-time":
                    return new XmlQualifiedName("dateTime", XmlSchemaNamespace);

                case "duration":
                    return new XmlQualifiedName("duration", XmlSchemaNamespace);

                case "day":
                    return new XmlQualifiedName("gDay", XmlSchemaNamespace);

                case "month":
                    return new XmlQualifiedName("gMonth", XmlSchemaNamespace);

                case "month-day":
                    return new XmlQualifiedName("gMonthDay", XmlSchemaNamespace);

                case "year":
                    return new XmlQualifiedName("gYear", XmlSchemaNamespace);

                case "year-month":
                    return new XmlQualifiedName("gYearMonth", XmlSchemaNamespace);

                case "time":
                    return new XmlQualifiedName("time", XmlSchemaNamespace);                                    
                    
                case "email":
                    return new XmlQualifiedName("string", XmlSchemaNamespace);
                    
                case "uri":
                    return new XmlQualifiedName("anyUri", XmlSchemaNamespace);                    
            }

            return new XmlQualifiedName("string", XmlSchemaNamespace);
        }

        private XmlSchemaElement ExtractElementSequence(string propertyName, JsonSchema propertyType, JsonSchema parentSchema)
        {
            XmlSchemaElement element = new XmlSchemaElement
            {
                Name = propertyName,
            };

            List<JsonSchema> items = GetterExtensions.Items(propertyType);
            if (items != null && items.Count > 0)
            {
                double? minItems = GetterExtensions.MinItems(propertyType);
                double? maxItems = GetterExtensions.MaxItems(propertyType);

                if (minItems != null)
                {
                    element.MinOccurs = (decimal)minItems;
                }

                if (maxItems != null && maxItems < MagicNumberMaxOccurs)
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
                    element.SchemaTypeName = new XmlQualifiedName(ExtractTypeFromDefinitionReference(typeRef));
                }
            }

            List<string> requiredFields = GetterExtensions.Required(parentSchema);
            if (requiredFields != null && requiredFields.Contains(propertyName))
            {
                // element.MinOccurs = 1; - is default
            }
            else
            {
                element.MinOccurs = 0;
                element.IsNillable = true;
            }

            string reference = GetterExtensions.Ref(propertyType);
            if (reference != null)
            {
                element.SchemaTypeName = new XmlQualifiedName(ExtractTypeFromDefinitionReference(reference));
            }

            return element;            
        }

        private string ExtractTypeFromDefinitionReference(string reference)
        {
            if (reference != null)
            {
                return reference.Replace("#/definitions/", string.Empty);
            }

            return "Unknown";
        }
    }
}
