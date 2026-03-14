using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;
using Json.Schema.Keywords;

namespace Altinn.Studio.DataModeling.Utils
{
    /// <summary>
    /// Extension methods for working with JsonSchema
    /// </summary>
    public static class JsonSchemaExtensions
    {
        /// <summary>
        /// Find keyword data by handler type.
        /// </summary>
        public static KeywordData FindKeywordByHandler<T>(this JsonSchema schema)
            where T : IKeywordHandler
        {
            return schema.Root?.Keywords?.FirstOrDefault(k => k.Handler is T);
        }

        /// <summary>
        /// Find keyword data by handler type in a keyword array.
        /// </summary>
        public static KeywordData FindKeywordByHandler<T>(this KeywordData[] keywords)
            where T : IKeywordHandler
        {
            return keywords?.FirstOrDefault(k => k.Handler is T);
        }

        /// <summary>
        /// Determine if a keyword is present in the schema by handler type.
        /// </summary>
        public static bool HasKeyword<T>(this JsonSchema schema)
            where T : IKeywordHandler
        {
            return schema.Root?.Keywords?.Any(k => k.Handler is T) ?? false;
        }

        /// <summary>
        /// Determine if a keyword is present in the keyword array.
        /// </summary>
        public static bool HasKeyword<T>(this KeywordData[] keywords)
            where T : IKeywordHandler
        {
            return keywords?.Any(k => k.Handler is T) ?? false;
        }

        /// <summary>
        /// Determine if any of the keywords are present in the schema.
        /// </summary>
        public static bool HasAnyOfKeywords(this JsonSchema schema, params Type[] handlerTypes)
        {
            return schema.Root?.Keywords?.Any(k => handlerTypes.Contains(k.Handler.GetType())) ?? false;
        }

        /// <summary>
        /// Try to retrieve keyword data by handler type.
        /// </summary>
        public static bool TryGetKeyword<T>(this JsonSchema schema, out KeywordData keyword)
            where T : IKeywordHandler
        {
            keyword = schema.FindKeywordByHandler<T>();
            return keyword != null;
        }

        /// <summary>
        /// Gets the handler name for a keyword data entry.
        /// Replacement for the v5 keyword.Keyword() method.
        /// </summary>
        public static string KeywordName(this KeywordData kd)
        {
            return kd.Handler.Name;
        }

        /// <summary>
        /// Gets the keywords from a schema (replacement for schema.Keywords).
        /// </summary>
        public static KeywordData[] GetKeywords(this JsonSchema schema)
        {
            return schema.Root?.Keywords;
        }

        // ========== Typed value accessors for standard keywords ==========

        /// <summary>
        /// Gets the SchemaValueType from a TypeKeyword's KeywordData.
        /// </summary>
        public static SchemaValueType GetTypeValue(this KeywordData kd)
        {
            return (SchemaValueType)kd.Value;
        }

        /// <summary>
        /// Gets the SchemaValueType from a schema's type keyword, or null if not present.
        /// </summary>
        public static SchemaValueType? GetSchemaType(this JsonSchema schema)
        {
            var kd = schema.FindKeywordByHandler<TypeKeyword>();
            return kd != null ? (SchemaValueType)kd.Value : null;
        }

        /// <summary>
        /// Gets the required properties from a RequiredKeyword's KeywordData.
        /// </summary>
        public static string[] GetRequiredProperties(this KeywordData kd)
        {
            return (string[])kd.Value;
        }

        /// <summary>
        /// Gets the $ref URI from a RefKeyword's KeywordData.
        /// </summary>
        public static Uri GetRefUri(this KeywordData kd)
        {
            return (Uri)kd.Value;
        }

        /// <summary>
        /// Gets the ref URI string from the raw value.
        /// </summary>
        public static string GetRefString(this KeywordData kd)
        {
            return kd.RawValue.GetString();
        }

        /// <summary>
        /// Converts subschemas of a KeywordData to JsonSchema instances.
        /// Used for allOf, oneOf, anyOf, items, etc.
        /// </summary>
        public static IReadOnlyList<JsonSchema> GetSubSchemas(this KeywordData kd)
        {
            if (kd.Subschemas == null || kd.Subschemas.Length == 0)
            {
                return Array.Empty<JsonSchema>();
            }

            return kd.Subschemas.Select(n => JsonSchema.Build(n.Source, JsonSchemaKeywords.GetBuildOptions())).ToList();
        }

        /// <summary>
        /// Gets a single sub-schema (e.g., for items keyword).
        /// </summary>
        public static JsonSchema GetSingleSubSchema(this KeywordData kd)
        {
            if (kd.Subschemas == null || kd.Subschemas.Length == 0)
            {
                return null;
            }

            return JsonSchema.Build(kd.Subschemas[0].Source, JsonSchemaKeywords.GetBuildOptions());
        }

        /// <summary>
        /// Gets properties as a dictionary from a PropertiesKeyword's KeywordData.
        /// </summary>
        public static IReadOnlyDictionary<string, JsonSchema> GetPropertiesDictionary(this KeywordData kd)
        {
            if (kd.Subschemas == null || kd.Subschemas.Length == 0)
            {
                return new Dictionary<string, JsonSchema>();
            }

            return kd.Subschemas.ToDictionary(
                n => n.RelativePath.GetSegment(n.RelativePath.SegmentCount - 1).ToString(),
                n => JsonSchema.Build(n.Source, JsonSchemaKeywords.GetBuildOptions())
            );
        }

        /// <summary>
        /// Gets the format string from a FormatKeyword's KeywordData.
        /// </summary>
        public static string GetFormatString(this KeywordData kd)
        {
            return kd.RawValue.GetString();
        }

        /// <summary>
        /// Gets a long value from a keyword (minLength, maxLength, minItems, maxItems).
        /// </summary>
        public static long GetLongValue(this KeywordData kd)
        {
            return (long)kd.Value;
        }

        /// <summary>
        /// Gets a decimal value from a keyword's raw value (minimum, maximum, etc.).
        /// </summary>
        public static decimal GetDecimalValue(this KeywordData kd)
        {
            return kd.RawValue.GetDecimal();
        }

        /// <summary>
        /// Gets the raw value as a JsonNode for use in builder.
        /// </summary>
        public static JsonNode GetRawValueAsNode(this KeywordData kd)
        {
            return JsonNode.Parse(kd.RawValue.GetRawText());
        }

        /// <summary>
        /// Gets a string value from a keyword's Value property.
        /// </summary>
        public static string GetStringValue(this KeywordData kd)
        {
            return (string)kd.Value;
        }

        // ========== Custom keyword value accessors ==========

        /// <summary>
        /// Gets the typed custom keyword value cast to T.
        /// </summary>
        public static T GetCustomValue<T>(this KeywordData kd)
        {
            return (T)kd.Value;
        }

        // ========== Builder helpers ==========

        /// <summary>
        /// Add a `type` keyword with optional nillable support.
        /// </summary>
        public static JsonSchemaBuilder Type(this JsonSchemaBuilder builder, SchemaValueType type, bool isNillable)
        {
            if (isNillable)
            {
                builder.Type(type, SchemaValueType.Null);
            }
            else
            {
                builder.Type(type);
            }

            return builder;
        }

        /// <summary>
        /// Build a JsonSchema from a builder using the configured build options.
        /// </summary>
        public static JsonSchema BuildWithOptions(this JsonSchemaBuilder builder)
        {
            return builder.Build(JsonSchemaKeywords.GetBuildOptions());
        }

        // ========== WorkList support ==========

        /// <summary>
        /// Create a <see cref="WorkList"/> from the keywords in this schema.
        /// </summary>
        public static WorkList AsWorkList(this JsonSchema schema)
        {
            return new WorkList(schema);
        }

        /// <summary>
        /// Orders the keywords by priority.
        /// XsdStructureKeyword should come first.
        /// </summary>
        public static IEnumerable<KeywordData> OrderByPriority(this KeywordData[] keywords)
        {
            return keywords.OrderBy(item => item.Handler is not XsdStructureKeyword);
        }
    }
}
