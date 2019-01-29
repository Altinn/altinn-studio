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
        private const int MagicNumberMaxOccurs = 99999;

        /// <summary>
        ///       Creates a XML schema object from the JSON Schema
        /// </summary>
        /// <param name="jSchema">bla bla</param>
        /// <returns>xmlschema</returns>
        public XmlSchema CreateXsd(JsonSchema jSchema)
        {
            if (jSchema == null)
            {
                throw new Exception("Cannot create XSD from empty (null) JsonSchema");
            }

            XmlSchema xsdSchema = new XmlSchema
            {
                ElementFormDefault = XmlSchemaForm.Qualified,
                AttributeFormDefault = XmlSchemaForm.Unqualified,
            };

            string title = GetterExtensions.Title(jSchema);

            // Handle global element declarations
            Dictionary<string, JsonSchema> globalProperties = jSchema.Properties();
            if (globalProperties != null)
            {
                foreach (KeyValuePair<string, JsonSchema> property in globalProperties)
                {
                    XmlSchemaElement rootElement = new XmlSchemaElement
                    {
                        Name = property.Key,
                        SchemaTypeName = GetTypeName(property.Value),
                    };

                    xsdSchema.Items.Add(rootElement);
                }
            }            

            // Handle all definitions
            Dictionary<string, JsonSchema> definitions = GetterExtensions.Definitions(jSchema);
            if (definitions != null)
            {
                foreach (KeyValuePair<string, JsonSchema> def in definitions)
                {
                    ExtractProperties(xsdSchema, def.Key, def.Value);
                }
            }            

            return xsdSchema;
        }

        private XmlQualifiedName GetTypeName(JsonSchema jSchema)
        {
            string referencedType = GetterExtensions.Ref(jSchema);
            if (!string.IsNullOrEmpty(referencedType))
            {
                return new XmlQualifiedName(ExtractTypeFromDefinitionReference(referencedType));
            }

            TypeKeyword type = jSchema.Get<TypeKeyword>();
            if (type != null)
            {
                switch (type.Value)
                {
                    case JsonSchemaType.String:
                        return new XmlQualifiedName("string", XmlSchemaNamespace);

                    case JsonSchemaType.Integer:
                        return new XmlQualifiedName("integer", XmlSchemaNamespace);

                    case JsonSchemaType.Number:
                        return new XmlQualifiedName("decimal", XmlSchemaNamespace);

                    case JsonSchemaType.Boolean:
                        return new XmlQualifiedName("boolean", XmlSchemaNamespace);

                    case JsonSchemaType.Array:
                        {
                            List<JsonSchema> itemsSchemas = GetterExtensions.Items(jSchema);
                            JsonSchema itemSchema = itemsSchemas.ToArray()[0];

                            string itemsReferencedType = GetterExtensions.Ref(itemSchema);
                            if (!string.IsNullOrEmpty(itemsReferencedType))
                            {
                                return new XmlQualifiedName(ExtractTypeFromDefinitionReference(itemsReferencedType));
                            }

                            return null;
                        }                   
                }

                return null;                
            }

            return null;
        }

        private void ExtractProperties(XmlSchema xsdSchema, string name, JsonSchema jSchema)
        {
            if (jSchema == JsonSchema.Empty)
            {
                // empty type, 
                var complexType = new XmlSchemaComplexType
                {
                    Name = name,
                };

                xsdSchema.Items.Add(complexType);                
            }          
            else if (jSchema.Properties() != null || jSchema.AllOf() != null || jSchema.OneOf() != null)
            {
                if (SimpleContent(jSchema))
                {
                    XmlSchemaComplexType complexType = ExtractComplexTypeSimpleContent(name, jSchema);
                    xsdSchema.Items.Add(complexType);
                }
                else
                {
                    XmlSchemaComplexType complexType = ExtractComplexType(name, jSchema);
                    xsdSchema.Items.Add(complexType);
                }                
            }
            else
            {
                XmlSchemaSimpleType simpleType = ExtractSimpleType(name, jSchema);                                
                xsdSchema.Items.Add(simpleType);               
            }
        }

        private XmlSchemaComplexType ExtractComplexTypeSimpleContent(string name, JsonSchema jSchema)
        {
            List<string> requiredProperties = GetterExtensions.Required(jSchema);
            XmlSchemaComplexType complexType = new XmlSchemaComplexType
            {
                Name = name,
            };

            XmlSchemaSimpleContent simpleContent = new XmlSchemaSimpleContent();
            XmlSchemaSimpleContentExtension extension = new XmlSchemaSimpleContentExtension();
            simpleContent.Content = extension;            
           
            foreach (var item in jSchema.Properties())
            {               
                if (item.Key.Equals("value") || HasSimpleContentAnnotation(item.Value))
                {                    
                    extension.BaseTypeName = new XmlQualifiedName(
                        ExtractTypeFromDefinitionReference(GetterExtensions.Ref(item.Value)));
                }
                else
                {
                    XmlSchemaAttribute attributeDefinition = ExtractAttribute(item.Key, item.Value);
                    if (requiredProperties.Contains(item.Key))
                    {
                        attributeDefinition.Use = XmlSchemaUse.Required;
                    }

                    extension.Attributes.Add(attributeDefinition);
                }
            }

            complexType.ContentModel = simpleContent;
            return complexType;
        }

        private bool HasSimpleContentAnnotation(JsonSchema jSchema)
        {
            string xmlSimpleContentAnnotation = jSchema.OtherData.TryGetString("@xsdType");
            if (xmlSimpleContentAnnotation != null && xmlSimpleContentAnnotation.Equals("XmlSimpleContentExtension"))
            {
                return true;
            }

            return false;
        }

        private bool SimpleContent(JsonSchema jSchema)
        {
            if (HasSimpleContentAnnotation(jSchema))
            {
                return true;
            }

            if (jSchema.Properties() != null)
            {
                foreach (var propertyItem in jSchema.Properties())
                {
                    if (HasSimpleContentAnnotation(propertyItem.Value))
                    {
                        return true;
                    }
                }
            }

            return false;
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
                XmlSchemaSequence sequence = new XmlSchemaSequence();

                List<JsonSchema> oneOf = GetterExtensions.OneOf(type);

                if (oneOf != null && oneOf.Count > 0)
                {
                    XmlSchemaChoice choice = new XmlSchemaChoice();
                    foreach (JsonSchema choiceType in oneOf)
                    {
                        var propSequence = ExtractAttributesAndElements(choiceType, complexType);
                        foreach (var item in propSequence.Items)
                        {
                            choice.Items.Add(item);
                        }                        
                    }

                    sequence.Items.Add(choice);
                }

                // handle properties
                XmlSchemaSequence propertySequence = ExtractAttributesAndElements(type, complexType);
                
                if (propertySequence != null && propertySequence.Items.Count > 0)
                {
                    foreach (var item in propertySequence.Items)
                    {
                        sequence.Items.Add(item);                        
                    }                    
                }

                if (sequence != null && sequence.Items.Count > 0)
                {
                    complexType.Particle = sequence;
                }
            }

            return complexType;
        }

        private XmlSchemaSequence ExtractAttributesAndElements(JsonSchema jSchema, XmlSchemaComplexType complexType)
        {
            if (jSchema == null || jSchema.Properties() == null)
            {
                return null;
            }

            XmlSchemaSequence sequence = new XmlSchemaSequence();
            foreach (KeyValuePair<string, JsonSchema> property in jSchema.Properties())
            {
                string propertyName = property.Key;
                JsonSchema propertyType = property.Value;

                string xsdType = propertyType.OtherData.TryGetString("@xsdType");
                if (xsdType != null && xsdType.Equals("XmlAttribute"))
                {
                    XmlSchemaAttribute attribute = ExtractAttribute(propertyName, propertyType);

                    complexType.Attributes.Add(attribute);
                }
                else
                {
                    sequence.Items.Add(ExtractElementSequence(propertyName, propertyType, jSchema));
                }
            }

            bool? xsdAnyAttribute = jSchema.OtherData.TryGetBoolean("@xsdAnyAttribute");
            if (xsdAnyAttribute == true)
            {
                complexType.AnyAttribute = new XmlSchemaAnyAttribute();
            }

            return sequence;
        }

        private XmlSchemaAttribute ExtractAttribute(string propertyName, JsonSchema propertyType)
        {
            XmlSchemaSimpleType simpleType = ExtractSimpleType("example", propertyType);

            XmlSchemaAttribute attribute = new XmlSchemaAttribute
            {
                Name = propertyName,
                SchemaTypeName = ((XmlSchemaSimpleTypeRestriction)simpleType.Content).BaseTypeName,
            };

            JsonValue constant = propertyType.Const();
            if (constant != null)
            {
                if (constant.String != null)
                {
                    attribute.FixedValue = constant.String;
                }
            }

            return attribute;
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
                // assume string type if type is missing
                var noTypeSimpleType = ExtractStringFacets(jSchema);
                noTypeSimpleType.BaseTypeName = null;

                simpleType.Content = noTypeSimpleType;                 

                return simpleType;
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
            else if (type.Value == JsonSchemaType.Array)
            {
                string xlist = jSchema.OtherData.TryGetString("@xsdType");
                if (xlist.Equals("XmlList"))
                {
                    XmlSchemaSimpleTypeList theList = new XmlSchemaSimpleTypeList();
                    List<JsonSchema> items = GetterExtensions.Items(jSchema);
                    string typeRef = GetterExtensions.Ref(items[0]);                    
                    theList.ItemTypeName = new XmlQualifiedName(ExtractTypeFromDefinitionReference(typeRef));

                    simpleType.Content = theList;
                }                
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
