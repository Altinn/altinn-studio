using System;
using System.Collections.Generic;
using System.Globalization;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using AltinnCore.Common.Factories.ModelFactory.Manatee.Json;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Common.Factories.ModelFactory
{
    /// <summary>
    ///     Utility class for converting JSON Schema to Xsd
    /// </summary>
    public class JsonSchemaToXsd
    {
        private const string XML_SCHEMA_NS = "http://www.w3.org/2001/XMLSchema";
        private const string BRREG_NS = "http://www.brreg.no/or";

        private XmlDocument xmlDocument = new XmlDocument();

        /// <summary>
        ///       Creates a XmlSchema object from a JSON Schema object
        /// </summary>
        /// <param name="jSchema">The Json Schema to convert</param>
        /// <returns>The converted XmlSchema object</returns>
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

            xsdSchema.Namespaces.Add("brreg", BRREG_NS);

            AddInfo(xsdSchema, jSchema);

            string title = GetterExtensions.Title(jSchema);
            string description = GetterExtensions.Description(jSchema);

            if (!string.IsNullOrEmpty(title) || !string.IsNullOrEmpty(description))
            {
                XmlSchemaAnnotation annotation = new XmlSchemaAnnotation();
                AddTitleAndDescriptionAnnotations(jSchema, annotation);

                xsdSchema.Items.Add(annotation);
            }

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
                    AddAnnotations(rootElement, property.Value);
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

        private void AddAnnotations(XmlSchemaAnnotated element, JsonSchema jSchema)
        {
            XmlSchemaAnnotation annotation = new XmlSchemaAnnotation();

            TextsKeyword text = jSchema.Get<TextsKeyword>();
            if (text != null)
            {
                JsonValue textObject = text.ToJson(new JsonSerializer());

                foreach (string textType in textObject.Object.Keys)
                {
                    JsonValue language = textObject.Object.GetValueOrDefault(textType);

                    foreach (string lang in language.Object.Keys)
                    {
                        string textMessage = language.Object.TryGetString(lang);

                        XmlElement p = xmlDocument.CreateElement("p");
                        p.AppendChild(xmlDocument.CreateTextNode(textMessage));

                        XmlElement brregTekst = xmlDocument.CreateElement("brreg", "tekst", BRREG_NS);
                        brregTekst.SetAttribute("lang", BRREG_NS, lang);
                        brregTekst.SetAttribute("teksttype", BRREG_NS, textType);
                        brregTekst.AppendChild(p);

                        XmlNode[] nodes = { brregTekst };
                        XmlSchemaDocumentation documentation = new XmlSchemaDocumentation
                        {
                            Markup = nodes,
                        };

                        annotation.Items.Add(documentation);
                    }
                }
            }

            AddTitleAndDescriptionAnnotations(jSchema, annotation);

            if (annotation.Items.Count > 0)
            {
                element.Annotation = annotation;
            }
        }

        private void AddTitleAndDescriptionAnnotations(JsonSchema jSchema, XmlSchemaAnnotation annotation)
        {
            string description = GetterExtensions.Description(jSchema);
            if (description != null)
            {
                annotation.Items.Add(CreateSimpleDocumentation("description", description));
            }

            string title = GetterExtensions.Title(jSchema);
            if (title != null)
            {
                annotation.Items.Add(CreateSimpleDocumentation("title", title));
            }
        }

        private XmlSchemaDocumentation CreateSimpleDocumentation(string type, string description)
        {            
            XmlSchemaDocumentation documentation = new XmlSchemaDocumentation();
            
            XmlNode[] nodes = { xmlDocument.CreateTextNode(description) };
            documentation.Markup = nodes;
            documentation.Source = type;

            return documentation;
        }

        private void AddInfo(XmlSchema xSchema, JsonSchema jSchema)
        {
            InfoKeyword info = jSchema.Get<InfoKeyword>();
            if (info != null)
            {
                XmlSchemaAnnotation annotation = new XmlSchemaAnnotation();
                XmlSchemaDocumentation documentation = new XmlSchemaDocumentation();
                annotation.Items.Add(documentation);

                List<XmlElement> elements = new List<XmlElement>();
                JsonObject infoObject = info.ToJson(new JsonSerializer()).Object;
                foreach (string attributeName in infoObject.Keys)
                {
                    XmlElement attrElement = xmlDocument.CreateElement("xs", "attribute", XML_SCHEMA_NS);
                    attrElement.SetAttribute("name", attributeName);
                    attrElement.SetAttribute("fixed", infoObject.TryGetString(attributeName));

                    elements.Add(attrElement);
                }

                documentation.Markup = elements.ToArray();

                xSchema.Items.Add(annotation);
            }
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
                        {
                            StringFormat format = GetterExtensions.Format(jSchema);
                            if (format != null)
                            {
                                return ExtractBaseTypeNameFromFormat(format.Key);
                            }
                            
                            return new XmlQualifiedName("string", XML_SCHEMA_NS);
                        }                        

                    case JsonSchemaType.Integer:
                        return new XmlQualifiedName("integer", XML_SCHEMA_NS);

                    case JsonSchemaType.Number:
                        return new XmlQualifiedName("decimal", XML_SCHEMA_NS);

                    case JsonSchemaType.Boolean:
                        return new XmlQualifiedName("boolean", XML_SCHEMA_NS);

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
                XmlSchemaComplexType complexType = new XmlSchemaComplexType
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

            AddAnnotations(complexType, jSchema);

            XmlSchemaSimpleContent simpleContent = new XmlSchemaSimpleContent();
            XmlSchemaSimpleContentExtension extension = new XmlSchemaSimpleContentExtension();
            simpleContent.Content = extension;            
           
            foreach (KeyValuePair<string, JsonSchema> item in jSchema.Properties())
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
                foreach (KeyValuePair<string, JsonSchema> propertyItem in jSchema.Properties())
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

            AddAnnotations(complexType, type);

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
                        XmlSchemaSequence propSequence = ExtractAttributesAndElements(choiceType, complexType);
                        foreach (XmlSchemaObject item in propSequence.Items)
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
                    foreach (XmlSchemaObject item in propertySequence.Items)
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

            List<string> requiredProperties = GetterExtensions.Required(jSchema);

            XmlSchemaSequence sequence = new XmlSchemaSequence();
            foreach (KeyValuePair<string, JsonSchema> property in jSchema.Properties())
            {
                string propertyName = property.Key;
                JsonSchema propertyType = property.Value;

                string xsdType = propertyType.OtherData.TryGetString("@xsdType");
                if (xsdType != null && xsdType.Equals("XmlAttribute"))
                {
                    XmlSchemaAttribute attribute = ExtractAttribute(propertyName, propertyType);
                    if (requiredProperties != null && requiredProperties.Contains(propertyName))
                    {
                        attribute.Use = XmlSchemaUse.Required;
                    }

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
                XmlSchemaAnyAttribute anyAttribute = new XmlSchemaAnyAttribute();
                anyAttribute.Namespace = "##targetNamespace";
                complexType.AnyAttribute = anyAttribute;
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

            if (simpleType.Content != null && simpleType.Content is XmlSchemaSimpleTypeRestriction && ((XmlSchemaSimpleTypeRestriction)simpleType.Content).Facets.Count > 0)
            {
                bool hasEnumeration = false;
                XmlSchemaSimpleTypeRestriction simpleTypeRestriction = (XmlSchemaSimpleTypeRestriction)simpleType.Content;
                foreach (XmlSchemaObject facet in simpleTypeRestriction.Facets)
                {
                    if (facet is XmlSchemaEnumerationFacet)
                    {
                        hasEnumeration = true;
                        break;
                    }
                }

                if (hasEnumeration)
                {
                    // add anonymous type
                    simpleType.Name = null;
                    attribute.SchemaType = simpleType;
                    attribute.SchemaTypeName = null;
                }                
            }

            AddAnnotations(attribute, propertyType);

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

            AddAnnotations(simpleType, jSchema);

            string reference = GetterExtensions.Ref(jSchema);
            if (reference != null)
            {
                XmlQualifiedName baseTypeName = new XmlQualifiedName(ExtractTypeFromDefinitionReference(reference));
                XmlSchemaSimpleTypeRestriction simpleTypeRestriction = new XmlSchemaSimpleTypeRestriction
                {
                    BaseTypeName = baseTypeName,
                };                

                XmlSchemaSimpleTypeRestriction stringFacets = ExtractStringFacets(jSchema);
                if (stringFacets.Facets.Count > 0)
                {
                    foreach (XmlSchemaObject facet in stringFacets.Facets)
                    {
                        simpleTypeRestriction.Facets.Add(facet);
                    }
                }

                XmlSchemaSimpleTypeRestriction numberFacets = ExtractNumberAndIntegerFacets(jSchema, new TypeKeyword(JsonSchemaType.Number));
                if (numberFacets.Facets.Count > 0)
                {
                    foreach (XmlSchemaObject facet in numberFacets.Facets)
                    {
                        simpleTypeRestriction.Facets.Add(facet);
                    }
                }

                simpleType.Content = simpleTypeRestriction;
                
                return simpleType;
            }

            TypeKeyword type = jSchema.Get<TypeKeyword>();

            if (type == null)
            {
                // assume string type if type is missing
                XmlSchemaSimpleTypeRestriction noTypeSimpleType = ExtractStringFacets(jSchema);
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
                    BaseTypeName = new XmlQualifiedName("boolean", XML_SCHEMA_NS),
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
                BaseTypeName = new XmlQualifiedName("string", XML_SCHEMA_NS),
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
            MaxLengthKeyword maxLength = jSchema.Get<MaxLengthKeyword>();

            if (minLength != null && maxLength != null && minLength.Value == maxLength.Value)
            {
                // special rule that maps equal min and max lengths to xsd length facet
                XmlSchemaLengthFacet lengthFacet = new XmlSchemaLengthFacet
                {
                    Value = minLength.Value.ToString(),
                };
                content.Facets.Add(lengthFacet);
            }
            else
            {
                if (minLength != null)
                {
                    XmlSchemaMinLengthFacet minLengthFacet = new XmlSchemaMinLengthFacet
                    {
                        Value = minLength.Value.ToString(),
                    };
                    content.Facets.Add(minLengthFacet);
                }

                if (maxLength != null)
                {
                    XmlSchemaMaxLengthFacet maxLengthFacet = new XmlSchemaMaxLengthFacet
                    {
                        Value = maxLength.Value.ToString(),
                    };
                    content.Facets.Add(maxLengthFacet);
                }
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
            double? minValue = GetterExtensions.Minimum(jSchema);
            double? minExclusiveValue = GetterExtensions.ExclusiveMinimum(jSchema);

            if (type.Value == JsonSchemaType.Number)
            {
                content.BaseTypeName = new XmlQualifiedName("decimal", XML_SCHEMA_NS);
            }
            else if (type.Value == JsonSchemaType.Integer)
            {
                if (minValue != null && minValue == 0.0)
                {
                    content.BaseTypeName = new XmlQualifiedName("positiveInteger", XML_SCHEMA_NS);
                }
                else
                {
                    content.BaseTypeName = new XmlQualifiedName("integer", XML_SCHEMA_NS);
                }                
            }

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
                    return new XmlQualifiedName("date", XML_SCHEMA_NS);

                case "date-time":
                    return new XmlQualifiedName("dateTime", XML_SCHEMA_NS);

                case "duration":
                    return new XmlQualifiedName("duration", XML_SCHEMA_NS);

                case "day":
                    return new XmlQualifiedName("gDay", XML_SCHEMA_NS);

                case "month":
                    return new XmlQualifiedName("gMonth", XML_SCHEMA_NS);

                case "month-day":
                    return new XmlQualifiedName("gMonthDay", XML_SCHEMA_NS);

                case "year":
                    return new XmlQualifiedName("gYear", XML_SCHEMA_NS);

                case "year-month":
                    return new XmlQualifiedName("gYearMonth", XML_SCHEMA_NS);

                case "time":
                    return new XmlQualifiedName("time", XML_SCHEMA_NS);                                    
                    
                case "email":
                    return new XmlQualifiedName("string", XML_SCHEMA_NS);
                    
                case "uri":
                    return new XmlQualifiedName("anyUri", XML_SCHEMA_NS);                    
            }

            return new XmlQualifiedName("string", XML_SCHEMA_NS);
        }

        private XmlSchemaElement ExtractElementSequence(string propertyName, JsonSchema propertyType, JsonSchema parentSchema)
        {
            XmlSchemaElement element = new XmlSchemaElement
            {
                Name = propertyName,
            };

            AddAnnotations(element, propertyType);

            List<JsonSchema> items = GetterExtensions.Items(propertyType);
            if (items != null && items.Count > 0)
            {
                double? minItems = GetterExtensions.MinItems(propertyType);
                double? maxItems = GetterExtensions.MaxItems(propertyType);

                if (minItems != null)
                {
                    element.MinOccurs = (decimal)minItems;
                }

                if (maxItems != null)
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

            XmlQualifiedName typeName = GetTypeName(propertyType);
            if (typeName != null)
            {
                element.SchemaTypeName = typeName;
            }

            List<string> requiredFields = GetterExtensions.Required(parentSchema);
            if (requiredFields == null || !requiredFields.Contains(propertyName))
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
