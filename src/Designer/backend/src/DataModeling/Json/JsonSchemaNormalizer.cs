using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Json.Schema.Keywords;

namespace Altinn.Studio.DataModeling.Json
{
    /// <summary>
    /// Class for normalizing and simplifying the structure of a JSON Schema
    /// without affecting validation.
    /// </summary>
    public class JsonSchemaNormalizer : IJsonSchemaNormalizer
    {
        /// <summary>
        /// Turns on and off normalization. With PerformNormalization = false you should
        /// get the same schema back. This is primarily used for testing to make
        /// sure all keywords and properties are handled.
        /// </summary>
        public bool PerformNormalization { get; set; } = true;

        /// <summary>
        /// Normalizes a JSON Schema by simplifying nested hierarchies.
        /// JSON documents will still validate as the simplified hierarchies
        /// does not affect schema validation.
        /// </summary>
        /// <returns>A new normalized JSON Schema.</returns>
        public JsonSchema Normalize(JsonSchema jsonSchema)
        {
            if (!PerformNormalization)
            {
                return jsonSchema;
            }

            return NormalizeSchema(jsonSchema);
        }

        private JsonSchema NormalizeSchema(JsonSchema schema)
        {
            var keywords = schema.GetKeywords();
            if (keywords == null)
            {
                return JsonSchema.True;
            }

            var builder = new JsonSchemaBuilder();
            foreach (var kd in keywords)
            {
                foreach (var normalizedKd in NormalizeKeyword(schema, kd))
                {
                    builder.Add(normalizedKd.Handler.Name, JsonNode.Parse(normalizedKd.RawValue.GetRawText()));
                }
            }

            return builder.Build(JsonSchemaKeywords.GetBuildOptions());
        }

        private IEnumerable<KeywordData> NormalizeKeyword(JsonSchema schema, KeywordData kd)
        {
            var results = new List<KeywordData>();

            if (kd.Handler is AllOfKeyword && HasSingleSubschema(kd))
            {
                var subSchemas = kd.GetSubSchemas();
                var subSchema = NormalizeSchema(subSchemas[0]);
                var parentKeywords = schema.GetKeywords();

                if (parentKeywords!.Length > 1 && subSchema.HasKeyword<RefKeyword>())
                {
                    // $ref is not allowed together with other keywords - keep allOf wrapper
                    var wrappedBuilder = new JsonSchemaBuilder().AllOf(RebuildAsBuilder(subSchema));
                    var wrappedSchema = wrappedBuilder.Build(JsonSchemaKeywords.GetBuildOptions());
                    var allOfKd = wrappedSchema.GetKeywords()!.First(k => k.Handler is AllOfKeyword);
                    results.Add(allOfKd);
                }
                else if (subSchema.GetKeywords()!.Length == 1 && subSchema.HasKeyword<AllOfKeyword>())
                {
                    // Collapse nested single subschema "allOf"s
                    results.Add(subSchema.GetKeywords()!.Single());
                }
                else if (parentKeywords!.Length == 1)
                {
                    // The allOf was the only keyword
                    results.AddRange(subSchema.GetKeywords()!);
                }
                else if (!HasCommonKeywords(schema, subSchema))
                {
                    // Merge the keywords into the current schema
                    results.AddRange(subSchema.GetKeywords()!);
                }
                else
                {
                    // Keep a single level of allOf with our normalized subschema
                    var wrappedBuilder = new JsonSchemaBuilder().AllOf(RebuildAsBuilder(subSchema));
                    var wrappedSchema = wrappedBuilder.Build(JsonSchemaKeywords.GetBuildOptions());
                    var allOfKd = wrappedSchema.GetKeywords()!.First(k => k.Handler is AllOfKeyword);
                    results.Add(allOfKd);
                }
            }

            if (results.Count == 0)
            {
                results.Add(kd);
            }

            // Normalize sub-schemas within keywords
            for (var i = 0; i < results.Count; i++)
            {
                var current = results[i];
                if (current.Subschemas is { Length: > 0 })
                {
                    // Rebuild with normalized subschemas
                    var subSchemas = current.GetSubSchemas();
                    var normalized = subSchemas.Select(NormalizeSchema).ToList();

                    // Reconstruct this keyword with normalized sub-schemas
                    var tempBuilder = new JsonSchemaBuilder();
                    if (current.Handler is PropertiesKeyword)
                    {
                        var props = current.GetPropertiesDictionary();
                        var normalizedProps = new Dictionary<string, JsonSchemaBuilder>();
                        foreach (var (key, _) in props)
                        {
                            var idx = props.Keys.ToList().IndexOf(key);
                            normalizedProps[key] = RebuildAsBuilder(NormalizeSchema(subSchemas[idx]));
                        }

                        tempBuilder.Properties(normalizedProps);
                    }
                    else if (
                        current.Handler is AllOfKeyword
                        || current.Handler is OneOfKeyword
                        || current.Handler is AnyOfKeyword
                    )
                    {
                        var normalizedBuilders = normalized.Select(RebuildAsBuilder).ToList();
                        if (current.Handler is AllOfKeyword)
                        {
                            tempBuilder.AllOf(normalizedBuilders);
                        }
                        else if (current.Handler is OneOfKeyword)
                        {
                            tempBuilder.OneOf(normalizedBuilders);
                        }
                        else
                        {
                            tempBuilder.AnyOf(normalizedBuilders);
                        }
                    }
                    else if (
                        current.Handler is ItemsKeyword
                        || current.Handler is AdditionalPropertiesKeyword
                        || current.Handler is NotKeyword
                        || current.Handler is ContainsKeyword
                    )
                    {
                        var normalizedSub = NormalizeSchema(subSchemas[0]);
                        tempBuilder.Add(current.Handler.Name, RebuildAsBuilder(normalizedSub));
                    }
                    else if (current.Handler is DefsKeyword)
                    {
                        var defsMap = current.Subschemas.ToDictionary(
                            n => n.RelativePath.GetSegment(n.RelativePath.SegmentCount - 1).ToString(),
                            n =>
                                RebuildAsBuilder(
                                    NormalizeSchema(JsonSchema.Build(n.Source, JsonSchemaKeywords.GetBuildOptions()))
                                )
                        );
                        tempBuilder.Defs(defsMap);
                    }
                    else
                    {
                        // For other keywords with subschemas, pass through as-is
                        tempBuilder.Add(current.Handler.Name, JsonNode.Parse(current.RawValue.GetRawText()));
                    }

                    var tempSchema = tempBuilder.Build(JsonSchemaKeywords.GetBuildOptions());
                    var rebuilt = tempSchema.GetKeywords()?.FirstOrDefault(k => k.Handler.Name == current.Handler.Name);
                    if (rebuilt != null)
                    {
                        results[i] = rebuilt;
                    }
                }
            }

            return results.Where(k => k != null);
        }

        private static JsonSchemaBuilder RebuildAsBuilder(JsonSchema schema)
        {
            var builder = new JsonSchemaBuilder();
            var keywords = schema.GetKeywords();
            if (keywords != null)
            {
                foreach (var kd in keywords)
                {
                    builder.Add(kd.Handler.Name, JsonNode.Parse(kd.RawValue.GetRawText()));
                }
            }

            return builder;
        }

        private static bool HasSingleSubschema(KeywordData kd)
        {
            return kd.Subschemas is { Length: 1 };
        }

        private static bool HasCommonKeywords(JsonSchema schema, JsonSchema other)
        {
            var schemaKeywords = schema.GetKeywords();
            var otherKeywords = other.GetKeywords();

            if ((schemaKeywords?.Length ?? 0) == 0 || (otherKeywords?.Length ?? 0) == 0)
            {
                return false;
            }

            var schemaNames = schemaKeywords.Select(k => k.Handler.Name);
            var otherNames = otherKeywords.Select(k => k.Handler.Name);

            return schemaNames.Intersect(otherNames).Any();
        }
    }
}
