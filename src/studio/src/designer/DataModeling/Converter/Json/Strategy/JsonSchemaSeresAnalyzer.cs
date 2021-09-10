using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public class JsonSchemaSeresAnalyzer : IJsonSchemaAnalyzer
    {
        private JsonSchema _schema;
        private JsonSchemaXsdMetadata _metadata;

        /// <summary>
        /// Initializes a new instance of the <see cref="JsonSchemaSeresAnalyzer"/> class.
        /// </summary>
        public JsonSchemaSeresAnalyzer()
        {
            _metadata = new JsonSchemaXsdMetadata();
        }

        /// <inheritdoc />
        public JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema)
        {
            _schema = schema;
            _metadata = new JsonSchemaXsdMetadata();

            if (_schema.TryGetKeyword(out InfoKeyword info))
            {
                var messageNameElement = info.Value.GetProperty("meldingsnavn");
                var messageTypeNameElement = info.Value.GetProperty("modellnavn");

                _metadata.MessageName = messageNameElement.ValueKind == JsonValueKind.Undefined ? "melding" : messageNameElement.GetString();
                _metadata.MessageTypeName = messageTypeNameElement.ValueKind == JsonValueKind.Undefined ? null : messageNameElement.GetString();
            }
            else
            {
                _metadata.MessageName = "melding";
            }

            DetermineRootModel(_schema);
            AnalyzeSchema(JsonPointer.Parse("#"), _schema);

            return _metadata;
        }

        private void DetermineRootModel(JsonSchema schema)
        {
            _metadata.HasInlineRoot = true;

            var allOf = schema.GetKeyword<AllOfKeyword>();
            var anyOf = schema.GetKeyword<AnyOfKeyword>();
            var oneOf = schema.GetKeyword<OneOfKeyword>();

            if (allOf != null && anyOf == null && oneOf == null)
            {
                // Only "allOf"
                _metadata.HasInlineRoot = !(allOf.Schemas.Count == 1 && IsRefSchema(allOf.Schemas[0]));
            }
            else if (allOf == null && anyOf != null && oneOf == null)
            {
                // Only "anyOf"
                _metadata.HasInlineRoot = !(anyOf.Schemas.Count == 1 && IsRefSchema(anyOf.Schemas[0]));
            }
            else if (allOf == null && anyOf == null && oneOf != null)
            {
                // Only "oneOf"
                _metadata.HasInlineRoot = !(oneOf.Schemas.Count == 1 && IsRefSchema(oneOf.Schemas[0]));
            }
        }

        private static bool IsRefSchema(JsonSchema schema)
        {
            return schema.HasKeyword<RefKeyword>();
        }

        private void AnalyzeSchema(JsonPointer path, JsonSchema schema)
        {
            // Follow all references, this will mark the schema as the type referenced if it has a $ref keyword
            // This will analyze some schemas multiple times and can be optimized if needed
            schema = FollowReferencesIfAny(schema);

            if (IsValidSimpleType(schema))
            {
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleType);

                if (IsValidAttribute(schema))
                {
                    _metadata.AddCompatibleTypes(path, CompatibleXsdType.Attribute);
                }

                if (IsValidUnhandledAttribute(schema))
                {
                    _metadata.AddCompatibleTypes(path, CompatibleXsdType.UnhandledAttribute);
                }
            }

            if (IsValidSimpleTypeRestriction(schema))
            {
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleType);
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleTypeRestriction);
            }

            if (IsValidComplexType(schema))
            {
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.ComplexType);
            }

            if (IsValidSimpleContentExtension(schema))
            {
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleContentExtension);
            }

            if (IsValidSimpleContentRestriction(schema))
            {
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleContentRestriction);
            }

            if (IsValidComplexContentExtension(path, schema))
            {
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.ComplexContent);
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.ComplexContentExtension);
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
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.UnhandledAttribute);
            }

            if (IsValidUnhandledEnumAttribute(schema))
            {
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.UnhandledEnumAttribute);
            }

            // Add "unknown" if no other was added on this path
            if (_metadata.GetCompatibleTypes(path).Count == 0)
            {
                _metadata.AddCompatibleTypes(path, CompatibleXsdType.Unknown);
            }
        }

        /// <summary>
        /// Returns true if the schema should be serialized as a XSD ComplexType.
        /// </summary>
        /// <param name="schema">Schema to analyze</param>
        /// <returns></returns>
        private bool IsValidComplexType(JsonSchema schema)
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

        private bool IsValidSimpleContentExtension(JsonSchema schema)
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

        private bool IsValidSimpleContentRestriction(JsonSchema schema)
        {
            if (!HasSingleAllOf(schema))
            {
                return false;
            }

            var allOf = schema.GetKeyword<AllOfKeyword>();
            var baseReferenceSchema = allOf.Schemas.SingleOrDefault(s => s.HasKeyword<RefKeyword>());
            if (baseReferenceSchema == null)
            {
                return false;
            }

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

        private List<(string propertyName, JsonSchema propertySchema)> FindSimpleContentProperties(JsonSchema schema)
        {
            var properties = new List<(string propertyName, JsonSchema propertySchema)>();

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

        private bool IsValidComplexContentExtension(JsonPointer path, JsonSchema schema)
        {
            if (_metadata.GetCompatibleTypes(path).Contains(CompatibleXsdType.SimpleContentRestriction))
            {
                return false;
            }

            if (schema.TryGetKeyword(out AllOfKeyword allOfKeyword) && allOfKeyword.GetSubschemas().Count() >= 2)
            {
                var subSchemas = allOfKeyword.GetSubschemas().ToList();
                var refKeywordSubSchema = subSchemas.FirstOrDefault(s => s.Keywords.HasKeyword<RefKeyword>());
                var propertiesKeywordSubSchema = subSchemas.FirstOrDefault(s => s.Keywords.HasKeyword<PropertiesKeyword>());
                                
                if (refKeywordSubSchema != null && propertiesKeywordSubSchema != null)
                {
                    var isComplexType = IsValidComplexType(refKeywordSubSchema);

                    if (!isComplexType)
                    {
                        return false;
                    }

                    // If the type of $ref is used in the context of a ComplextContentExtension
                    // it cannot be serialized as a SimpleContentExtension or SimpleContentRestriction.
                    var refKeyword = refKeywordSubSchema.GetKeyword<RefKeyword>();
                    var refKeywordPath = JsonPointer.Parse(refKeyword.Reference.ToString());
                    _metadata.AddIncompatibleTypes(refKeywordPath, new[] { CompatibleXsdType.SimpleContentExtension, CompatibleXsdType.SimpleContentRestriction });

                    return true;
                }                
            }

            return false;
        }

        private bool IsValidSimpleType(JsonSchema schema)
        {
            if (!schema.TryGetKeyword(out TypeKeyword type))
            {
                return false;
            }

            switch (type.Type)
            {
                case SchemaValueType.Object:
                case SchemaValueType.Null:
                    return false;
                case SchemaValueType.Array:
                    return false;
                case SchemaValueType.Boolean:
                case SchemaValueType.String:
                case SchemaValueType.Number:
                case SchemaValueType.Integer:
                    return true;
                default:
                    return false;
            }
        }

        private bool IsValidAttribute(JsonSchema schema)
        {
            if (schema.Keywords.HasKeyword<XsdAttributeKeyword>())
            {
                return true;
            }

            return false;
        }

        private bool IsValidUnhandledAttribute(JsonSchema schema)
        {
            if (schema.Keywords.HasKeyword<XsdUnhandledAttributesKeyword>())
            {
                return true;
            }

            return false;
        }

        private bool IsValidUnhandledEnumAttribute(JsonSchema schema)
        {
            if (schema.Keywords.HasKeyword<XsdUnhandledEnumAttributesKeyword>())
            {
                return true;
            }

            return false;
        }

        private bool IsValidSimpleTypeRestriction(JsonSchema schema)
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

            return hasBaseType && hasRestrictions;
        }

        private JsonSchema FollowReferencesIfAny(JsonSchema schema)
        {
            while (schema.TryGetKeyword(out RefKeyword reference))
            {
                schema = FollowReference(reference);
            }

            return schema;
        }

        private JsonSchema FollowReference(RefKeyword refKeyword)
        {
            var pointer = JsonPointer.Parse(refKeyword.Reference.ToString());
            return _schema.FollowReference(pointer);
        }

        private bool IsPlainRestrictionSchema(JsonSchema schema)
        {
            return IsPlainRestrictionSchema(schema.AsWorkList());
        }

        private bool IsPlainRestrictionSchema(WorkList<IJsonSchemaKeyword> keywords)
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

        private bool IsValidSimpleTypeOrSimpleTypeRestriction(JsonSchema schema)
        {
            return IsValidSimpleType(schema) || IsValidSimpleTypeRestriction(schema);
        }

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

        private void AnalyzeKeyword(JsonPointer path, IJsonSchemaKeyword keyword)
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

                // case ISchemaCollector schemaCollector:
                //    foreach (var schema in schemaCollector.Schemas)
                //    {
                //        AnalyzeSchema(path, schema);
                //    }

                //    break;
                case ISchemaContainer schemaContainer:
                    AnalyzeSchema(path, schemaContainer.Schema);
                    break;
            }
        }
    }
}
