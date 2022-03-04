using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;

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
        public abstract JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema, Uri uri);

        /// <summary>
        /// Determines the type of root model the provided schema has.
        /// </summary>
        /// <param name="schema">The Json Schema to analyze.</param>
        protected void DetermineRootModel(JsonSchema schema)
        {
            Metadata.HasInlineRoot = true;

            var allOf = schema.GetKeyword<AllOfKeyword>();
            var anyOf = schema.GetKeyword<AnyOfKeyword>();
            var oneOf = schema.GetKeyword<OneOfKeyword>();

            if (allOf != null && anyOf == null && oneOf == null)
            {
                // Only "allOf"
                Metadata.HasInlineRoot = !(allOf.Schemas.Count == 1 && IsRefSchema(allOf.Schemas[0]));
            }
            else if (allOf == null && anyOf != null && oneOf == null)
            {
                // Only "anyOf"
                Metadata.HasInlineRoot = !(anyOf.Schemas.Count == 1 && IsRefSchema(anyOf.Schemas[0]));
            }
            else if (allOf == null && anyOf == null && oneOf != null)
            {
                // Only "oneOf"
                Metadata.HasInlineRoot = !(oneOf.Schemas.Count == 1 && IsRefSchema(oneOf.Schemas[0]));
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

            if (schema.Keywords != null)
            {
                foreach (var keyword in schema.Keywords)
                {
                    var keywordPath = path.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));
                    AnalyzeKeyword(keywordPath, keyword);
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
        /// <param name="keyword">The keyword to be analyzed.</param>
        protected void AnalyzeKeyword(JsonPointer path, IJsonSchemaKeyword keyword)
        {
            switch (keyword)
            {
                case AllOfKeyword item:
                    for (var i = 0; i < item.Schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/[{i}]")), item.Schemas[i]);
                    }

                    break;
                case AnyOfKeyword item:
                    for (var i = 0; i < item.Schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/[{i}]")), item.Schemas[i]);
                    }

                    break;
                case OneOfKeyword item:
                    for (var i = 0; i < item.Schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/[{i}]")), item.Schemas[i]);
                    }

                    break;
                case DefinitionsKeyword item:
                    foreach (var (name, definition) in item.Definitions)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/{name}")), definition);
                    }

                    break;
                case DefsKeyword item:
                    foreach (var (name, definition) in item.Definitions)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/{name}")), definition);
                    }

                    break;
                case PropertiesKeyword item:
                    foreach (var (name, definition) in item.Properties)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/{name}")), definition);
                    }

                    break;

                case ISchemaContainer schemaContainer:
                    AnalyzeSchema(path, schemaContainer.Schema);
                    break;
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
            if (schema.TryGetKeyword(out TypeKeyword typeKeyword) && typeKeyword.Type.HasFlag(SchemaValueType.Array))
            {
                var itemsKeyword = schema.GetKeyword<ItemsKeyword>();
                if (itemsKeyword == null)
                {
                    throw new JsonSchemaConvertException("Schema must have an \"items\" keyword when \"type\" is set to array");
                }

                itemsSchema = itemsKeyword.SingleSchema;
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

            // If it doesn't have a oneOf, or the oneOf only has one sub-schema, it's not a candidate for
            // a nillable element.
            if (!schema.TryGetKeyword(out OneOfKeyword oneOfKeyword) || oneOfKeyword.GetSubschemas().Count() < 2)
            {
                valueSchema = null;
                return false;
            }

            // If we have 2 or more sub-schema's, but none of them with a type keyword, it's not
            // a candidate for a nillable element.
            var subSchemas = oneOfKeyword.GetSubschemas().ToList();
            var typeKeywordSubSchema = subSchemas.FirstOrDefault(s => s.Keywords.HasKeyword<TypeKeyword>());

            if (typeKeywordSubSchema == null)
            {
                valueSchema = null;
                return false;
            }

            // If we have 2 or more sub-schema's and one of them has a valid type of null, it should
            // be represented as a nillable element in the XSD.
            if (typeKeywordSubSchema.TryGetKeyword(out TypeKeyword typeKeyword) && typeKeyword.Type == SchemaValueType.Null)
            {
                var refKeywordSubSchema = subSchemas.FirstOrDefault(s => s.Keywords.HasKeyword<RefKeyword>());
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
            return schema.TryGetKeyword(out TypeKeyword typeKeywordSingle) && typeKeywordSingle.Type.HasFlag(SchemaValueType.Null) && typeKeywordSingle.Type > SchemaValueType.Null;
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

            if (schema.TryGetKeyword(out AllOfKeyword allOfKeyword))
            {
                foreach (var subSchema in allOfKeyword.GetSubschemas())
                {
                    var isComplexType = IsValidComplexType(subSchema);
                    if (isComplexType)
                    {
                        return true;
                    }
                }
            }

            if (schema.TryGetKeyword(out AnyOfKeyword anyOfKeyword))
            {
                foreach (var subSchema in anyOfKeyword.GetSubschemas())
                {
                    var isComplexType = IsValidComplexType(subSchema);
                    if (isComplexType)
                    {
                        return true;
                    }
                }
            }

            if (schema.TryGetKeyword(out OneOfKeyword oneOfKeyword))
            {
                foreach (var subSchema in oneOfKeyword.GetSubschemas())
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
            if (schema.HasAnyOfKeywords(
                typeof(AllOfKeyword),
                typeof(OneOfKeyword),
                typeof(AnyOfKeyword),
                typeof(IfKeyword),
                typeof(ThenKeyword),
                typeof(ElseKeyword),
                typeof(NotKeyword)))
            {
                return false;
            }

            if (!schema.TryGetKeyword(out PropertiesKeyword properties))
            {
                return false;
            }

            // One of the properties must be named value
            if (!properties.Properties.TryGetValue("value", out var valuePropertySchema))
            {
                return false;
            }

            // It must not be marked as attribute
            if (valuePropertySchema.GetKeyword<XsdAttributeKeyword>()?.Value == true)
            {
                return false;
            }

            // follow any $ref keywords to validate against the actual subschema
            while (valuePropertySchema.TryGetKeyword(out RefKeyword reference))
            {
                valuePropertySchema = FollowReference(reference);
            }

            // And it must be a valid SimpleType or a reference to a valid SimpleType
            if (!IsValidSimpleTypeOrSimpleTypeRestriction(valuePropertySchema))
            {
                return false;
            }

            // All other properties must be attributes
            var attributePropertiesCount = properties.Properties.Values.Count(prop =>
            {
                var typeSchema = prop;

                // follow any $ref keywords to validate against the actual subschema
                while (typeSchema.TryGetKeyword(out RefKeyword reference))
                {
                    typeSchema = FollowReference(reference);
                }

                return IsValidSimpleTypeOrSimpleTypeRestriction(typeSchema) &&
                       prop.HasKeyword<XsdAttributeKeyword>(kw => kw.Value);
            });

            if (attributePropertiesCount != (properties.Properties.Count - 1))
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

            var allOf = schema.GetKeyword<AllOfKeyword>();
            var baseReferenceSchemas = allOf.Schemas.Where(s => s.HasKeyword<RefKeyword>()).ToList();
            if (baseReferenceSchemas.Count != 1)
            {
                return false;
            }

            var baseReferenceSchema = baseReferenceSchemas[0];
            var baseSchema = FollowReference(baseReferenceSchema.GetKeyword<RefKeyword>());

            // Make sure base is valid for SimpleContent restriction
            if (!IsValidSimpleContentExtension(baseSchema) && !IsValidSimpleContentRestriction(baseSchema))
            {
                return false;
            }

            var propertiesSchemas = allOf.Schemas.Where(s => s.HasKeyword<PropertiesKeyword>()).ToList();

            // Don't allow extra subschemas not used in the pattern
            if (propertiesSchemas.Count + 1 != allOf.Schemas.Count)
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

                if (!baseSchema.TryGetKeyword(out AllOfKeyword baseAllOf))
                {
                    break;
                }

                var baseRefSchema = baseAllOf.Schemas
                    .SingleOrDefault(s => s.HasKeyword<RefKeyword>())
                    ?.GetKeyword<RefKeyword>();

                if (baseRefSchema == null)
                {
                    break;
                }

                baseSchema = FollowReference(baseRefSchema);
            }

            var hasValueProperty = false;

            foreach (var (propertyName, propertySchema) in propertiesSchemas.SelectMany(ps => ps.GetKeyword<PropertiesKeyword>().Properties.Select(prop => (prop.Key, prop.Value))))
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

                if (!IsValidSimpleTypeOrSimpleTypeRestriction(propertyTargetSchema) && !IsPlainRestrictionSchema(propertyTargetSchema))
                {
                    return false;
                }
            }

            return hasValueProperty;
        }

        private static List<(string PropertyName, JsonSchema PropertySchema)> FindSimpleContentProperties(JsonSchema schema)
        {
            var properties = new List<(string PropertyName, JsonSchema PropertySchema)>();

            if (HasSingleAllOf(schema))
            {
                foreach (var propertiesSchema in schema.GetKeyword<AllOfKeyword>().Schemas.Where(s => s.HasKeyword<PropertiesKeyword>()))
                {
                    var propertiesKeyword = propertiesSchema.GetKeyword<PropertiesKeyword>();
                    properties.AddRange(propertiesKeyword.Properties.Select(prop => (prop.Key, prop.Value)));
                }
            }
            else if (schema.TryGetKeyword(out PropertiesKeyword propertiesKeyword))
            {
                properties.AddRange(propertiesKeyword.Properties.Select(prop => (prop.Key, prop.Value)));
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

            if (schema.TryGetKeyword(out AllOfKeyword allOfKeyword))
            {
                var subSchemas = allOfKeyword.GetSubschemas().ToList();
                var refKeywordSubSchemaCount = subSchemas.Count(s => s.Keywords.HasKeyword<RefKeyword>());
                if (refKeywordSubSchemaCount > 1)
                {
                    return false;
                }

                var refKeywordSubSchema = subSchemas.FirstOrDefault(s => s.Keywords.HasKeyword<RefKeyword>());

                if (refKeywordSubSchema != null)
                {
                    var isComplexType = IsValidComplexType(refKeywordSubSchema);

                    if (!isComplexType)
                    {
                        return false;
                    }

                    // If the type of $ref is used in the context of a ComplexContentExtension
                    // it cannot be serialized as a SimpleContentExtension or SimpleContentRestriction.
                    var refKeyword = refKeywordSubSchema.GetKeyword<RefKeyword>();
                    var refKeywordPath = JsonPointer.Parse(refKeyword.Reference.ToString());
                    Metadata.AddIncompatibleTypes(refKeywordPath, new[] { CompatibleXsdType.SimpleContentExtension, CompatibleXsdType.SimpleContentRestriction });

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
            if (!schema.TryGetKeyword(out TypeKeyword typeKeyword))
            {
                return false;
            }

            // This is the case of nillable, so we remove the Null type to be left with the actual type.
            var type = typeKeyword.Type;

            if (type.HasFlag(SchemaValueType.Null) && type > SchemaValueType.Null)
            {
                type &= ~SchemaValueType.Null;
            }

            return type switch
            {
                SchemaValueType.Object or SchemaValueType.Null => false,
                SchemaValueType.Array => false,
                SchemaValueType.Boolean or SchemaValueType.String or SchemaValueType.Number or SchemaValueType.Integer => true,
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

            var allOf = schema.GetKeyword<AllOfKeyword>();

            var hasBaseType = false;
            var hasRestrictions = false;

            foreach (var item in allOf.Schemas)
            {
                var subschema = item;

                // follow any $ref keywords to validate against the actual subschema
                while (subschema.TryGetKeyword(out RefKeyword reference))
                {
                    subschema = FollowReference(reference);
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

            return hasBaseType && (hasRestrictions || allOf.Schemas.Count == 1);
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
            if (schema.Keywords.HasKeyword<XsdAttributeKeyword>())
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
            if (schema.Keywords.HasKeyword<XsdUnhandledAttributesKeyword>())
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
            if (schema.Keywords.HasKeyword<XsdUnhandledEnumAttributesKeyword>())
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
            while (schema.TryGetKeyword(out RefKeyword reference))
            {
                schema = FollowReference(reference);
            }

            return schema;
        }

        /// <summary>
        /// Will recursively follow a the provided ref keyword
        /// to the last schema, and return this.
        /// </summary>
        /// <param name="refKeyword">The initial ref keyword to follow.</param>
        /// <returns><see cref="JsonSchema"/> for the last referenced schema.</returns>
        protected JsonSchema FollowReference(RefKeyword refKeyword)
        {
            var pointer = JsonPointer.Parse(refKeyword.Reference.ToString());
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
        private static bool IsPlainRestrictionSchema(WorkList<IJsonSchemaKeyword> keywords)
        {
            var keywordsValidated = 0;

            foreach (var keyword in keywords.EnumerateUnhandledItems())
            {
                keywordsValidated++;

                switch (keyword)
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
            if (schema.Keywords == null)
            {
                return false;
            }

            var keywords = schema.AsWorkList();
            if (!keywords.TryPull(out AllOfKeyword _))
            {
                return false;
            }

            foreach (var item in keywords.EnumerateUnhandledItems())
            {
                // Check if the keyword is allowed
                switch (item)
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
