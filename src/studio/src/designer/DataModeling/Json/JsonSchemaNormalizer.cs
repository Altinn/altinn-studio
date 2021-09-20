using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;

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
            if (schema.Keywords == null)
            {
                return JsonSchema.True;
            }

            var builder = new JsonSchemaBuilder();
            foreach (var keyword in schema.Keywords)
            {
                foreach (var kw in NormalizeKeyword(schema, keyword))
                {
                    builder.Add(kw);
                }
            }

            return builder.Build();
        }

        private IEnumerable<IJsonSchemaKeyword> NormalizeKeyword(JsonSchema schema, IJsonSchemaKeyword keyword)
        {
            var keywords = new List<IJsonSchemaKeyword>();

            if (keyword is AllOfKeyword allOf && HasSingleSubschema(allOf))
            {
                var subSchema = NormalizeSchema(allOf.Schemas[0]);

                if (schema.Keywords!.Count > 1 && subSchema.HasKeyword<RefKeyword>())
                {
                    // $ref is not allowed together with other keywords
                    keywords.Add(new AllOfKeyword(subSchema));
                }
                else if (subSchema.Keywords!.Count == 1 && subSchema.HasKeyword<AllOfKeyword>())
                {
                    // Collapse nested single subschema "allOf"s
                    keywords.Add(subSchema.Keywords!.Single());
                }
                else if (schema.Keywords!.Count == 1)
                {
                    // The allOf was the only keyword
                    keywords.AddRange(subSchema.Keywords!);
                }
                else if (!HasCommonKeywords(schema, subSchema))
                {
                    // Merge the keywords the current schema
                    keywords.AddRange(subSchema.Keywords!);
                }
                else
                {
                    // We need to keep a single level of allOf with our normalized subschema
                    keywords.Add(new AllOfKeyword(subSchema));
                }
            }

            if (keywords.Count == 0)
            {
                keywords.Add(keyword);
            }

            for (var i = 0; i < keywords.Count; i++)
            {
                switch (keywords[i])
                {
                    case ISchemaContainer container:
                        keywords[i] = (IJsonSchemaKeyword)Activator.CreateInstance(keywords[i].GetType(), NormalizeSchema(container.Schema));
                        break;
                    case ISchemaCollector collector:
                        keywords[i] = (IJsonSchemaKeyword)Activator.CreateInstance(keywords[i].GetType(), collector.Schemas.Select(NormalizeSchema));
                        break;
                    case IKeyedSchemaCollector keyedCollector:
                        var schemas = new List<(string name, JsonSchema schema)>();
                        foreach (var (key, s) in keyedCollector.Schemas)
                        {
                            schemas.Add((key, NormalizeSchema(s)));
                        }

                        keywords[i] = (IJsonSchemaKeyword)Activator.CreateInstance(keywords[i].GetType(), schemas.ToDictionary(x => x.name, x => x.schema));
                        break;
                }
            }

            return keywords.Where(kw => kw != null);
        }

        private static bool HasSingleSubschema(AllOfKeyword allOf)
        {
            return allOf.Schemas.Count == 1;
        }

        private static bool HasCommonKeywords(JsonSchema schema, JsonSchema other)
        {
            if ((schema.Keywords?.Count ?? 0) == 0 || (other.Keywords?.Count ?? 0) == 0)
            {
                return false;
            }

            var schemaKeywords = schema.Keywords.Select(keyword => keyword.Keyword());
            var otherKeywords = other.Keywords.Select(keyword => keyword.Keyword());

            return schemaKeywords.Intersect(otherKeywords).Any();
        }
    }
}
