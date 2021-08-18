using System;
using System.Collections.Generic;
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

        /// <inheritdoc />
        public JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema)
        {
            _schema = schema;

            var metadata = new JsonSchemaXsdMetadata();

            if (_schema.TryGetKeyword(out InfoKeyword info))
            {
                var messageNameElement = info.Value.GetProperty("meldingsnavn");
                var messageTypeNameElement = info.Value.GetProperty("modellnavn");

                metadata.MessageName = messageNameElement.ValueKind == JsonValueKind.Undefined ? "melding" : messageNameElement.GetString();
                metadata.MessageTypeName = messageTypeNameElement.ValueKind == JsonValueKind.Undefined ? null : messageNameElement.GetString();
            }
            else
            {
                metadata.MessageName = "melding";
            }

            DetermineRootModel(_schema, metadata);
            AnalyzeSchema(JsonPointer.Parse("#"), _schema, metadata);

            return metadata;
        }

        private void DetermineRootModel(JsonSchema schema, JsonSchemaXsdMetadata metadata)
        {
            metadata.HasInlineRoot = true;

            var allOf = schema.GetKeyword<AllOfKeyword>();
            var anyOf = schema.GetKeyword<AnyOfKeyword>();
            var oneOf = schema.GetKeyword<OneOfKeyword>();

            if (allOf != null && anyOf == null && oneOf == null)
            {
                // Only "allOf"
                metadata.HasInlineRoot = !(allOf.Schemas.Count == 1 && IsRefSchema(allOf.Schemas[0]));
            }
            else if (allOf == null && anyOf != null && oneOf == null)
            {
                // Only "anyOf"
                metadata.HasInlineRoot = !(anyOf.Schemas.Count == 1 && IsRefSchema(anyOf.Schemas[0]));
            }
            else if (allOf == null && anyOf == null && oneOf != null)
            {
                // Only "oneOf"
                metadata.HasInlineRoot = !(oneOf.Schemas.Count == 1 && IsRefSchema(oneOf.Schemas[0]));
            }
        }

        private static bool IsRefSchema(JsonSchema schema)
        {
            return schema.HasKeyword<RefKeyword>();
        }

        private void AnalyzeSchema(JsonPointer path, JsonSchema schema, JsonSchemaXsdMetadata metadata)
        {
            if (IsValidSimpleType(schema))
            {
                metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleType);
            }

            if (IsValidSimpleTypeRestriction(schema))
            {
                metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleTypeRestriction);
            }

            if (IsValidComplexType(schema))
            {
                metadata.AddCompatibleTypes(path, CompatibleXsdType.ComplexType);
            }

            if (IsValidSimpleContentExtension(schema))
            {
                metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleContentExtension);
            }

            if (IsValidSimpleContentRestriction(schema))
            {
                metadata.AddCompatibleTypes(path, CompatibleXsdType.SimpleContentRestriction);
            }

            if (IsValidComplexContent(schema))
            {
                metadata.AddCompatibleTypes(path, CompatibleXsdType.ComplexContent);
            }

            if (schema.Keywords != null)
            {
                foreach (var keyword in schema.Keywords)
                {
                    var keywordPath = path.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));
                    AnalyzeKeyword(keywordPath, keyword, metadata);
                }
            }

            // Add "unknown" if no other was added on this path
            if (metadata.GetCompatibleTypes(path).Count == 0)
            {
                metadata.AddCompatibleTypes(path, CompatibleXsdType.Unknown);
            }
        }

        /// <summary>
        /// Returns true if the schema should be serialized as a XSD ComplexType.
        /// </summary>
        /// <param name="schema">Schema to analyze</param>
        /// <returns></returns>
        private bool IsValidComplexType(JsonSchema schema)
        {
            if (schema.HasKeyword<PropertiesKeyword>())
            {
                return true;
            }

            if (schema.TryGetKeyword(out RefKeyword refKeyword))
            {
                var subschema = FollowReference(refKeyword);

                return IsValidComplexType(subschema);
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

            return false;
        }

        private bool IsValidSimpleContentExtension(JsonSchema schema)
        {
            // TODO: Implement
            return false;
        }

        private bool IsValidSimpleContentRestriction(JsonSchema schema)
        {
            // TODO: Implement
            return false;
        }

        private bool IsValidComplexContent(JsonSchema schema)
        {
            // TODO: Implement
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

        private bool IsValidSimpleTypeRestriction(JsonSchema schema)
        {
            if (!HasSingleAllOf(schema))
            {
                return false;
            }

            var allOf = schema.GetKeyword<AllOfKeyword>();

            JsonSchema baseTypeSchema = null;

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
                    if (baseTypeSchema != null)
                    {
                        return false;
                    }

                    baseTypeSchema = subschema;
                }
                else if (!IsPlainRestrictionSchema(subschema))
                {
                    return false;
                }
            }

            return baseTypeSchema != null;
        }

        private JsonSchema FollowReference(RefKeyword refKeyword)
        {
            var pointer = JsonPointer.Parse(refKeyword.Reference.ToString());
            IRefResolvable schemaSegment = _schema;
            foreach (var segment in pointer.Segments)
            {
                schemaSegment = schemaSegment.ResolvePointerSegment(segment.Value);
                if (schemaSegment == null)
                {
                    return null;
                }
            }

            return schemaSegment as JsonSchema;
        }

        private bool IsPlainRestrictionSchema(JsonSchema schema)
        {
            var keywords = schema.AsWorkList();

            foreach (var keyword in keywords)
            {
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
                    default:
                        return false;
                }
            }

            return true;
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

            if (schema.Keywords.Count != 1)
            {
                return false;
            }

            return schema.Keywords.Single() is AllOfKeyword;
        }

        private void AnalyzeKeyword(JsonPointer path, IJsonSchemaKeyword keyword, JsonSchemaXsdMetadata metadata)
        {
            switch (keyword)
            {
                case AllOfKeyword item:
                    for (var i = 0; i < item.Schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/[{i}]")), item.Schemas[i], metadata);
                    }

                    break;
                case AnyOfKeyword item:
                    for (var i = 0; i < item.Schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/[{i}]")), item.Schemas[i], metadata);
                    }

                    break;
                case OneOfKeyword item:
                    for (var i = 0; i < item.Schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/[{i}]")), item.Schemas[i], metadata);
                    }

                    break;
                case DefinitionsKeyword item:
                    foreach (var (name, definition) in item.Definitions)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/{name}")), definition, metadata);
                    }

                    break;
                case DefsKeyword item:
                    foreach (var (name, definition) in item.Definitions)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/{name}")), definition, metadata);
                    }

                    break;
                case PropertiesKeyword item:
                    foreach (var (name, definition) in item.Properties)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"/{name}")), definition, metadata);
                    }

                    break;
                case ISchemaContainer schemaContainer:
                    AnalyzeSchema(path, schemaContainer.Schema, metadata);
                    break;
            }
        }
    }
}
