using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;
using Json.Schema.Keywords;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <inheritdoc/>
    public abstract class JsonSchemaAnalyzer : IJsonSchemaAnalyzer
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="JsonSchemaAnalyzer"/> bseclass.
        /// </summary>
        protected JsonSchemaAnalyzer()
        {
            Metadata = new JsonSchemaXsdMetadata();
        }

        /// <summary>
        /// Json Schema to be analyzed
        /// </summary>
        protected JsonSchema JsonSchema { get; set; }

        /// <summary>
        /// The results av the analyzis process.
        /// </summary>
        protected JsonSchemaXsdMetadata Metadata { get; set; }

        /// <inheritdoc/>
        public abstract JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema);

        /// <summary>
        /// Determines the type of root model the provided schema has.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        protected void DetermineRootModel(JsonSchema schema)
        {
            Metadata.HasInlineRoot = true;

            var allOfKd = schema.FindKeywordByHandler<AllOfKeyword>();
            var anyOfKd = schema.FindKeywordByHandler<AnyOfKeyword>();
            var oneOfKd = schema.FindKeywordByHandler<OneOfKeyword>();

            if (allOfKd != null && anyOfKd == null && oneOfKd == null)
            {
                // Only "allOf"
                var allOfSchemas = allOfKd.GetSubSchemas();
                Metadata.HasInlineRoot = !(allOfSchemas.Count == 1 && IsRefSchema(allOfSchemas[0]));
            }
            else if (allOfKd == null && anyOfKd != null && oneOfKd == null)
            {
                // Only "anyOf"
                var anyOfSchemas = anyOfKd.GetSubSchemas();
                Metadata.HasInlineRoot = !(anyOfSchemas.Count == 1 && IsRefSchema(anyOfSchemas[0]));
            }
            else if (allOfKd == null && anyOfKd == null && oneOfKd != null)
            {
                // Only "oneOf"
                var oneOfSchemas = oneOfKd.GetSubSchemas();
                Metadata.HasInlineRoot = !(oneOfSchemas.Count == 1 && IsRefSchema(oneOfSchemas[0]));
            }
        }

        /// <summary>
        /// Primary method to call for analyzing a Json Schema.
        /// </summary>
        /// <param name="path">The path to start analyzing. Normally this should be the root path when calling this method ie. '#'</param>
        /// <param name="schema">The Json Schema to analyze.</param>
        protected void AnalyzeSchema(JsonPointer path, JsonSchema schema)
        {
            if (TryParseAsNillableElement(schema, out var valueSchema))
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.Nillable);
                if (valueSchema != null)
                {
                    AnalyzeSchema(path, valueSchema);
                    return;
                }
            }

            if (TryParseAsArray(schema, out var itemSchema))
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.Array);
                AnalyzeSchema(path, itemSchema);
                return;
            }

            // Follow all references, this will mark the schema as the type referenced if it has a $ref keyword
            // This will analyze some schemas multiple times and can be optimized if needed
            schema = FollowReferencesIfAny(schema);

            if (IsValidSimpleType(schema))
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleType);

                if (IsValidAttribute(schema))
                {
                    Metadata.AddCompatibleTypes(path, CompatibleXsdType.Attribute);
                }

                if (IsValidUnhandledAttribute(schema))
                {
                    Metadata.AddCompatibleTypes(path, CompatibleXsdType.UnhandledAttribute);
                }
            }

            if (IsValidSimpleTypeRestriction(schema))
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleType);
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleTypeRestriction);
            }

            if (IsValidComplexType(schema))
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.ComplexType);
            }

            if (IsValidSimpleContentExtension(schema))
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleContentExtension);
            }

            if (IsValidSimpleContentRestriction(schema))
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleContentRestriction);
            }

            if (IsValidComplexContentExtension(path, schema))
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.ComplexContent);
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.ComplexContentExtension);
            }

            var keywords = schema.GetKeywords();
            if (keywords != null)
            {
                foreach (var kd in keywords)
                {
                    var keywordPath = path.Combine(JsonPointer.Parse($"/{kd.Handler.Name}"));
                    AnalyzeKeyword(keywordPath, kd);
                }
            }

            if (IsValidUnhandledAttribute(schema))
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.UnhandledAttribute);
            }

            if (IsValidUnhandledEnumAttribute(schema))
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.UnhandledEnumAttribute);
            }

            // Add "unknown" if no other was added on this path
            if (Metadata.GetCompatibleTypes(path).Count == 0)
            {
                Metadata.AddCompatibleTypes(path, CompatibleXsdType.Unknown);
            }
        }

        /// <summary>
        /// Recursively analyzes all schemas for the provided keyword.
        /// </summary>
        /// <param name="path"><see cref="JsonPointer"/> representing the actual path to the keyword being provided.</param>
        /// <param name="kd">The keyword data to be analyzed.</param>
        protected void AnalyzeKeyword(JsonPointer path, KeywordData kd)
        {
            switch (kd.Handler)
            {
                case AllOfKeyword:
                {
                    var schemas = kd.GetSubSchemas();
                    for (var i = 0; i < schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/[{i}]")), schemas[i]);
                    }

                    break;
                }
                case AnyOfKeyword:
                {
                    var schemas = kd.GetSubSchemas();
                    for (var i = 0; i < schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/[{i}]")), schemas[i]);
                    }

                    break;
                }
                case OneOfKeyword:
                {
                    var schemas = kd.GetSubSchemas();
                    for (var i = 0; i < schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/[{i}]")), schemas[i]);
                    }

                    break;
                }
                case global::Json.Schema.Keywords.Draft06.DefinitionsKeyword:
                {
                    var definitions = kd.GetPropertiesDictionary();
                    foreach (var (name, definition) in definitions)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/{name}")), definition);
                    }

                    break;
                }
                case DefsKeyword:
                {
                    var definitions = kd.GetPropertiesDictionary();
                    foreach (var (name, definition) in definitions)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/{name}")), definition);
                    }

                    break;
                }
                case PropertiesKeyword:
                {
                    var properties = kd.GetPropertiesDictionary();
                    foreach (var (name, definition) in properties)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/{name}")), definition);
                    }

                    break;
                }

                default:
                {
                    // Handle keywords with a single subschema (replacement for ISchemaContainer)
                    if (kd.Subschemas is { Length: 1 })
                    {
                        var subSchema = kd.GetSingleSubSchema();
                        if (subSchema != null)
                        {
                            AnalyzeSchema(path, subSchema);
                        }
                    }

                    break;
                }
            }
        }

        /// <summary>
        /// Determines if a schema is a reference schema or not.
        /// A reference schema is a schema that has the $ref keyword.
        /// For further reference see https://json-schema.org/understanding-json-schema/structuring.html#ref
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns></returns>
        protected static bool IsRefSchema(JsonSchema schema)
        {
            return schema.HasKeyword<RefKeyword>();
        }

        /// <summary>
        /// Tries to parse a schema to verify if it an array and returns the item schema if it is.
        /// For furter reference see https://json-schema.org/understanding-json-schema/reference/array.html
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <param name="itemsSchema">If the schema is an array this will return schema for the items in the array; otherwise, null.</param>
        /// <returns>True if the schema is an array; otherwise, false</returns>
        protected static bool TryParseAsArray(JsonSchema schema, out JsonSchema itemsSchema)
        {
            if (
                schema.TryGetKeyword<TypeKeyword>(out var typeKd)
                && typeKd.GetTypeValue().HasFlag(SchemaValueType.Array)
            )
            {
                var itemsKd = schema.FindKeywordByHandler<ItemsKeyword>();
                if (itemsKd == null)
                {
                    throw new JsonSchemaConvertException(
                        "Schema must have an \"items\" keyword when \"type\" is set to array"
                    );
                }

                itemsSchema = itemsKd.GetSingleSubSchema();
                return true;
            }

            itemsSchema = null;
            return false;
        }

        /// <summary>
        /// Tries to parse a schema to verify if it should be represented as a nillable element in the XSD.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <param name="valueSchema">If the schema</param>
        /// <returns>True if it should be represented as a nillable element; otherwise, false.</returns>
        private static bool TryParseAsNillableElement(JsonSchema schema, out JsonSchema valueSchema)
        {
            // If the type keyword has null in combination with other types, it should be represented
            // as a nillable element.
            if (HasTypeKeywordWithNullAndOtherTypes(schema))
            {
                valueSchema = null;
                return true;
            }

            if (schema.TryGetKeyword<XsdNillableKeyword>(out var nillableKd) && (bool)nillableKd.Value)
            {
                valueSchema = null;
                return true;
            }

            // If it doesn't have a oneOf, or the oneOf only has one sub-schema, it's not a candidate for
            // a nillable element.
            if (!schema.TryGetKeyword<OneOfKeyword>(out var oneOfKd))
            {
                valueSchema = null;
                return false;
            }

            var oneOfSchemas = oneOfKd.GetSubSchemas();
            if (oneOfSchemas.Count < 2)
            {
                valueSchema = null;
                return false;
            }

            // If we have 2 or more sub-schema's, but none of them with a type keyword, it's not
            // a candidate for a nillable element.
            var subSchemas = oneOfSchemas.ToList();
            var typeKeywordSubSchema = subSchemas.FirstOrDefault(s => s.GetKeywords().HasKeyword<TypeKeyword>());

            if (typeKeywordSubSchema == null)
            {
                valueSchema = null;
                return false;
            }

            // If we have 2 or more sub-schema's and one of them has a valid type of null, it should
            // be represented as a nillable element in the XSD.
            if (
                typeKeywordSubSchema.TryGetKeyword<TypeKeyword>(out var typeKd)
                && typeKd.GetTypeValue() == SchemaValueType.Null
            )
            {
                var refKeywordSubSchema = subSchemas.FirstOrDefault(s => s.GetKeywords().HasKeyword<RefKeyword>());
                valueSchema = refKeywordSubSchema;
                return true;
            }

            valueSchema = null;
            return false;
        }

        /// <summary>
        /// Determines if a schema has a type keyword with null as it's value in combination with other types.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if the type keyword has Null type in combination with other types; otherwise, false.</returns>
        protected static bool HasTypeKeywordWithNullAndOtherTypes(JsonSchema schema)
        {
            return schema.TryGetKeyword<TypeKeyword>(out var typeKd)
                && typeKd.GetTypeValue().HasFlag(SchemaValueType.Null)
                && typeKd.GetTypeValue() > SchemaValueType.Null;
        }

        /// <summary>
        /// Determines if the schema should be represented as a ComplexType in the XSD.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it should be represented as a ComplexType in the XSD; otherwise, false.</returns>
        protected bool IsValidComplexType(JsonSchema schema)
        {
            schema = FollowReferencesIfAny(schema);

            if (schema.HasKeyword<PropertiesKeyword>())
            {
                return true;
            }

            if (schema.TryGetKeyword<AllOfKeyword>(out var allOfKd))
            {
                foreach (var subSchema in allOfKd.GetSubSchemas())
                {
                    var isComplexType = IsValidComplexType(subSchema);
                    if (isComplexType)
                    {
                        return true;
                    }
                }
            }

            if (schema.TryGetKeyword<AnyOfKeyword>(out var anyOfKd))
            {
                foreach (var subSchema in anyOfKd.GetSubSchemas())
                {
                    var isComplexType = IsValidComplexType(subSchema);
                    if (isComplexType)
                    {
                        return true;
                    }
                }
            }

            if (schema.TryGetKeyword<OneOfKeyword>(out var oneOfKd))
            {
                foreach (var subSchema in oneOfKd.GetSubSchemas())
                {
                    var isComplexType = IsValidComplexType(subSchema);
                    if (isComplexType)
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        /// <summary>
        /// Determines if the schema should be represented as a SimpleContentExtension in the XSD.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it should be represented as a SimpleContentExtension in the XSD; otherwise, false.</returns>
        protected bool IsValidSimpleContentExtension(JsonSchema schema)
        {
            // Exclude schemas with groupings
            if (
                schema.HasAnyOfKeywords(
                    typeof(AllOfKeyword),
                    typeof(OneOfKeyword),
                    typeof(AnyOfKeyword),
                    typeof(IfKeyword),
                    typeof(ThenKeyword),
                    typeof(ElseKeyword),
                    typeof(NotKeyword)
                )
            )
            {
                return false;
            }

            if (!schema.TryGetKeyword<PropertiesKeyword>(out var propsKd))
            {
                return false;
            }

            var properties = propsKd.GetPropertiesDictionary();

            // One of the properties must be named value
            if (!properties.TryGetValue("value", out var valuePropertySchema))
            {
                return false;
            }

            // It must not be marked as attribute
            var xsdAttrKd = valuePropertySchema.FindKeywordByHandler<XsdAttributeKeyword>();
            if (xsdAttrKd != null && (bool)xsdAttrKd.Value)
            {
                return false;
            }

            // follow any $ref keywords to validate against the actual subschema
            while (valuePropertySchema.TryGetKeyword<RefKeyword>(out var refKd))
            {
                valuePropertySchema = FollowReference(refKd);
            }

            // And it must be a valid SimpleType or a reference to a valid SimpleType
            if (!IsValidSimpleTypeOrSimpleTypeRestriction(valuePropertySchema))
            {
                return false;
            }

            // All other properties must be attributes
            var attributePropertiesCount = properties.Values.Count(prop =>
            {
                var typeSchema = prop;

                // follow any $ref keywords to validate against the actual subschema
                while (typeSchema.TryGetKeyword<RefKeyword>(out var refKd))
                {
                    typeSchema = FollowReference(refKd);
                }

                return IsValidSimpleTypeOrSimpleTypeRestriction(typeSchema)
                    && prop.TryGetKeyword<XsdAttributeKeyword>(out var attrKd)
                    && (bool)attrKd.Value;
            });

            if (attributePropertiesCount != (properties.Count - 1))
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Determines if the schema should be represented as a SimpleContentRestriction in the XSD.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it should be represented as a SimpleContentRestriction in the XSD; otherwise, false.</returns>
        protected bool IsValidSimpleContentRestriction(JsonSchema schema)
        {
            if (!HasSingleAllOf(schema))
            {
                return false;
            }

            var allOfKd = schema.FindKeywordByHandler<AllOfKeyword>();
            var allOfSchemas = allOfKd.GetSubSchemas();
            var baseReferenceSchemas = allOfSchemas.Where(s => s.HasKeyword<RefKeyword>()).ToList();
            if (baseReferenceSchemas.Count != 1)
            {
                return false;
            }

            var baseReferenceSchema = baseReferenceSchemas[0];
            var baseSchema = FollowReference(baseReferenceSchema.FindKeywordByHandler<RefKeyword>());

            // Make sure base is valid for SimpleContent restriction
            if (!IsValidSimpleContentExtension(baseSchema) && !IsValidSimpleContentRestriction(baseSchema))
            {
                return false;
            }

            var propertiesSchemas = allOfSchemas.Where(s => s.HasKeyword<PropertiesKeyword>()).ToList();

            // Don't allow extra subschemas not used in the pattern
            if (propertiesSchemas.Count + 1 != allOfSchemas.Count)
            {
                return false;
            }

            // All restriction properties must match properties from base type(s)
            var basePropertyNames = new HashSet<string>();
            while (!IsValidSimpleType(baseSchema))
            {
                foreach (var (propertyName, _) in FindSimpleContentProperties(baseSchema))
                {
                    basePropertyNames.Add(propertyName);
                }

                if (!baseSchema.TryGetKeyword<AllOfKeyword>(out var baseAllOfKd))
                {
                    break;
                }

                var baseAllOfSchemas = baseAllOfKd.GetSubSchemas();
                var baseRefKd = baseAllOfSchemas
                    .SingleOrDefault(s => s.HasKeyword<RefKeyword>())
                    ?.FindKeywordByHandler<RefKeyword>();

                if (baseRefKd == null)
                {
                    break;
                }

                baseSchema = FollowReference(baseRefKd);
            }

            var hasValueProperty = false;

            foreach (
                var (propertyName, propertySchema) in propertiesSchemas.SelectMany(ps =>
                    ps.FindKeywordByHandler<PropertiesKeyword>()
                        .GetPropertiesDictionary()
                        .Select(prop => (prop.Key, prop.Value))
                )
            )
            {
                if (!basePropertyNames.Contains(propertyName))
                {
                    // Can't restrict a property that is not present in base types, this is not a valid simple content restriction
                    return false;
                }

                var propertyTargetSchema = FollowReferencesIfAny(propertySchema);

                if (!hasValueProperty && propertyName == "value")
                {
                    // "value" property
                    hasValueProperty = true;

                    // "value" property cannot be an attribute
                    if (propertySchema.HasKeyword<XsdAttributeKeyword>())
                    {
                        return false;
                    }
                }
                else
                {
                    // restriction property must be an attribute
                    if (!propertySchema.HasKeyword<XsdAttributeKeyword>())
                    {
                        return false;
                    }
                }

                if (
                    !IsValidSimpleTypeOrSimpleTypeRestriction(propertyTargetSchema)
                    && !IsPlainRestrictionSchema(propertyTargetSchema)
                )
                {
                    return false;
                }
            }

            return hasValueProperty;
        }

        private static List<(string PropertyName, JsonSchema PropertySchema)> FindSimpleContentProperties(
            JsonSchema schema
        )
        {
            var properties = new List<(string PropertyName, JsonSchema PropertySchema)>();

            if (HasSingleAllOf(schema))
            {
                var allOfKd = schema.FindKeywordByHandler<AllOfKeyword>();
                foreach (var propertiesSchema in allOfKd.GetSubSchemas().Where(s => s.HasKeyword<PropertiesKeyword>()))
                {
                    var propsDict = propertiesSchema
                        .FindKeywordByHandler<PropertiesKeyword>()
                        .GetPropertiesDictionary();
                    properties.AddRange(propsDict.Select(prop => (prop.Key, prop.Value)));
                }
            }
            else if (schema.TryGetKeyword<PropertiesKeyword>(out var propsKd))
            {
                var propsDict = propsKd.GetPropertiesDictionary();
                properties.AddRange(propsDict.Select(prop => (prop.Key, prop.Value)));
            }

            return properties;
        }

        /// <summary>
        /// Determines if the schema should be represented as a ComplexContentExtension in the XSD.
        /// </summary>
        /// <param name="path">A Json Pointer representing the path to the schema being passed in ie. these should match.</param>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it should be represented as a SimpleContentExtension in the XSD; otherwise, false.</returns>
        protected bool IsValidComplexContentExtension(JsonPointer path, JsonSchema schema)
        {
            if (Metadata.GetCompatibleTypes(path).Contains(CompatibleXsdType.SimpleContentRestriction))
            {
                return false;
            }

            if (schema.TryGetKeyword<AllOfKeyword>(out var allOfKd))
            {
                var subSchemas = allOfKd.GetSubSchemas().ToList();
                var refKeywordSubSchemaCount = subSchemas.Count(s => s.GetKeywords().HasKeyword<RefKeyword>());
                if (refKeywordSubSchemaCount > 1)
                {
                    return false;
                }

                var refKeywordSubSchema = subSchemas.FirstOrDefault(s => s.GetKeywords().HasKeyword<RefKeyword>());

                if (refKeywordSubSchema != null)
                {
                    var isComplexType = IsValidComplexType(refKeywordSubSchema);

                    if (!isComplexType)
                    {
                        return false;
                    }

                    // If the type of $ref is used in the context of a ComplexContentExtension
                    // it cannot be serialized as a SimpleContentExtension or SimpleContentRestriction.
                    var refKd = refKeywordSubSchema.FindKeywordByHandler<RefKeyword>();
                    var refKeywordPath = JsonPointer.Parse(refKd.GetRefString());
                    Metadata.AddIncompatibleTypes(
                        refKeywordPath,
                        new[] { CompatibleXsdType.SimpleContentExtension, CompatibleXsdType.SimpleContentRestriction }
                    );

                    return true;
                }
            }

            return false;
        }

        /// <summary>
        /// Determines if the schema should be represented as a SimpleType in the XSD.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it should be represented as a SimpleType in the XSD; otherwise, false.</returns>
        protected static bool IsValidSimpleType(JsonSchema schema)
        {
            if (!schema.TryGetKeyword<TypeKeyword>(out var typeKd))
            {
                return false;
            }

            // This is the case of nillable, so we remove the Null type to be left with the actual type.
            var type = typeKd.GetTypeValue();

            if (type.HasFlag(SchemaValueType.Null) && type > SchemaValueType.Null)
            {
                type &= ~SchemaValueType.Null;
            }

            return type switch
            {
                SchemaValueType.Object or SchemaValueType.Null => false,
                SchemaValueType.Array => false,
                SchemaValueType.Boolean
                or SchemaValueType.String
                or SchemaValueType.Number
                or SchemaValueType.Integer => true,
                _ => false,
            };
        }

        /// <summary>
        /// Determines if the schema is a valid SimpleType or SimpleTypeRestriction.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it is a SimpleType or SimpleTypeRestriction; otherwise, false.</returns>
        protected bool IsValidSimpleTypeOrSimpleTypeRestriction(JsonSchema schema)
        {
            return IsValidSimpleType(schema) || IsValidSimpleTypeRestriction(schema);
        }

        /// <summary>
        /// Determines if the schema should be represented as a SimpleTypeRestriction in the XSD.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it should be represented as a SimpleTypeRestriction in the XSD; otherwise, false.</returns>
        protected bool IsValidSimpleTypeRestriction(JsonSchema schema)
        {
            if (schema.TryGetKeyword<XsdStructureKeyword>(out var xsdStructureKd))
            {
                if ((string)xsdStructureKd.Value == nameof(XmlSchemaSimpleTypeRestriction))
                {
                    return true;
                }
            }

            if (!HasSingleAllOf(schema))
            {
                var keywords = schema.AsWorkList();
                var type = keywords.Pull<TypeKeyword>();
                if (type == null)
                {
                    return false;
                }

                // Clear out other known keywords for this type
                keywords.MarkAsHandled<XsdTypeKeyword>();
                keywords.MarkAsHandled<FormatKeyword>();

                return IsPlainRestrictionSchema(keywords);
            }

            var allOfKd = schema.FindKeywordByHandler<AllOfKeyword>();
            var allOfSchemas = allOfKd.GetSubSchemas();

            var hasBaseType = false;
            var hasRestrictions = false;

            foreach (var item in allOfSchemas)
            {
                var subschema = item;

                // follow any $ref keywords to validate against the actual subschema
                while (subschema.TryGetKeyword<RefKeyword>(out var refKd))
                {
                    subschema = FollowReference(refKd);
                }

                if (IsValidSimpleTypeOrSimpleTypeRestriction(subschema))
                {
                    if (hasBaseType)
                    {
                        return false;
                    }

                    hasBaseType = true;
                }
                else if (IsPlainRestrictionSchema(subschema))
                {
                    hasRestrictions = true;
                }
                else
                {
                    return false;
                }
            }

            return hasBaseType && (hasRestrictions || allOfSchemas.Count == 1);
        }

        /// <summary>
        /// Determines if the schema should be represented as a attribute in the XSD.
        /// Json Schemas doesn't have the concept of attributes, everything is a property.
        /// This check is based on the existence of a custom keyword, @xsdAttribute, to
        /// instruct the converter to treat this as an attribute in the XSD.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it should be represented as a Attribute in the XSD; otherwise, false.</returns>
        protected static bool IsValidAttribute(JsonSchema schema)
        {
            if (schema.HasKeyword<XsdAttributeKeyword>())
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Determines if the schema should be represented as a unhandled
        /// attributes in the XSD ie. attributes that's unknown to the XSD schema
        /// namespace.
        /// This check is based on the existence of a custom keyword, @xsdUnhandledAttributes, to
        /// instruct the converter to treat this as a collection of unhandled attributes.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it should be represented as a collection of UnhandledAttributes; otherwise, false.</returns>
        protected static bool IsValidUnhandledAttribute(JsonSchema schema)
        {
            if (schema.HasKeyword<XsdUnhandledAttributesKeyword>())
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Determines if the schema should be represented as a unhandled
        /// attributes on the enum values them selves. Json Schema does not have a sub-schema
        /// on enum values, so this custom keyword, @xsdUnhandledEnumAttribute is placed on the paren element as a collection
        /// specifiying which enum value the key/value pairs belong to.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it should be represented as a collection of UnhandledAttributes; otherwise, false.</returns>
        private static bool IsValidUnhandledEnumAttribute(JsonSchema schema)
        {
            if (schema.HasKeyword<XsdUnhandledEnumAttributesKeyword>())
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Will recursively follow a schemas reference based on the ref keyword
        /// to the last schema, and return this.
        /// </summary>
        /// <param name="schema">The initial Json Schema to follow reference.</param>
        /// <returns><see cref="JsonSchema"/> for the last referenced schema.</returns>
        protected JsonSchema FollowReferencesIfAny(JsonSchema schema)
        {
            while (schema.TryGetKeyword<RefKeyword>(out var refKd))
            {
                schema = FollowReference(refKd);
            }

            return schema;
        }

        /// <summary>
        /// Will recursively follow a the provided ref keyword data
        /// to the last schema, and return this.
        /// </summary>
        /// <param name="refKd">The ref keyword data to follow.</param>
        /// <returns><see cref="JsonSchema"/> for the last referenced schema.</returns>
        protected JsonSchema FollowReference(KeywordData refKd)
        {
            var pointer = JsonPointer.Parse(refKd.GetRefString());
            return JsonSchema.FollowReference(pointer);
        }

        /// <summary>
        /// Determines if the provided schema is a plain restriction schema ie.
        /// it's only has keywords for restricting simple data types.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        /// <returns>True if it is a plain restriction schema; otherwise, false.</returns>
        protected static bool IsPlainRestrictionSchema(JsonSchema schema)
        {
            return IsPlainRestrictionSchema(schema.AsWorkList());
        }

        /// <summary>
        /// Determines if the provided keywords is representing a plain restriction schema ie.
        /// it's only has keywords for restricting simple data types.
        /// </summary>
        /// <param name="keywords">The set of keywords to analyze.</param>
        /// <returns>True if it is a plain restriction schema; otherwise, false.</returns>
        private static bool IsPlainRestrictionSchema(WorkList keywords)
        {
            var keywordsValidated = 0;

            foreach (var kd in keywords.EnumerateUnhandledItems())
            {
                keywordsValidated++;

                switch (kd.Handler)
                {
                    case MinLengthKeyword:
                    case MaxLengthKeyword:
                    case MaximumKeyword:
                    case MinimumKeyword:
                    case ExclusiveMaximumKeyword:
                    case ExclusiveMinimumKeyword:
                    case EnumKeyword:
                    case PatternKeyword:
                    case MultipleOfKeyword:
                        continue;

                    // Allow No-op keywords
                    case TitleKeyword:
                    case CommentKeyword:
                    case DeprecatedKeyword:
                    case DescriptionKeyword:
                    case ExamplesKeyword:
                    case XsdUnhandledEnumAttributesKeyword:
                        continue;

                    // Add format range restrictions
                    case FormatMinimumKeyword:
                    case FormatExclusiveMinimumKeyword:
                    case FormatMaximumKeyword:
                    case FormatExclusiveMaximumKeyword:
                        continue;

                    // Add totalDigits restriction
                    case XsdTotalDigitsKeyword:
                        continue;

                    default:
                        return false;
                }
            }

            return keywordsValidated > 0;
        }

        /// <summary>
        /// Determines if the schema has a single allOf keyword.
        /// </summary>
        /// <param name="schema">The schema to be analyzed.</param>
        /// <returns>True if it has a single allOf keyword; otherwise, false.</returns>
        private static bool HasSingleAllOf(JsonSchema schema)
        {
            if (schema.GetKeywords() == null)
            {
                return false;
            }

            var keywords = schema.AsWorkList();
            if (!keywords.TryPull<AllOfKeyword>(out _))
            {
                return false;
            }

            foreach (var kd in keywords.EnumerateUnhandledItems())
            {
                // Check if the keyword is allowed
                switch (kd.Handler)
                {
                    case TitleKeyword:
                    case CommentKeyword:
                    case DeprecatedKeyword:
                    case DescriptionKeyword:
                    case ExamplesKeyword:
                    case ConstKeyword:
                    case DefaultKeyword:
                    case XsdAnyKeyword:
                    case XsdAnyAttributeKeyword:
                    case XsdStructureKeyword:
                    case XsdAttributeKeyword:
                    case XsdUnhandledAttributesKeyword:
                    case InfoKeyword:
                        continue;
                    default:
                        return false;
                }
            }

            return true;
        }
    }
}
