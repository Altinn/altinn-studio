using System.Linq;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public class JsonSchemaToXmlSchemaConverterSeresStrategy : IJsonSchemaToXmlSchemaConverterStrategy
    {
        private JsonSchema _schema;

        /// <inheritdoc />
        public JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema)
        {
            _schema = schema;
            JsonSchemaXsdMetadata metadata = new JsonSchemaXsdMetadata();

            AnalyzeSchema(JsonPointer.Parse("/"), schema, metadata);

            return metadata;
        }

        /// <inheritdoc />
        public XmlSchema Convert(JsonSchema schema, JsonSchemaXsdMetadata metadata)
        {
            _schema = schema;
            throw new System.NotImplementedException();
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
                foreach (IJsonSchemaKeyword keyword in schema.Keywords)
                {
                    JsonPointer keywordPath = path.Combine(JsonPointer.Parse(keyword.Keyword()));
                    AnalyzeKeyword(keywordPath, keyword, metadata);
                }
            }

            // Add "unknown" if no other was added on this path
            if (metadata.GetCompatibleTypes(path).Count == 0)
            {
                metadata.AddCompatibleTypes(path, CompatibleXsdType.Unknown);
            }
        }

        private bool IsValidComplexType(JsonSchema schema)
        {
            // TODO: Implement properly
            return schema.HasKeyword<PropertiesKeyword>();
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

            AllOfKeyword allOf = schema.GetKeyword<AllOfKeyword>();

            JsonSchema baseTypeSchema = null;

            foreach (JsonSchema item in allOf.Schemas)
            {
                JsonSchema subschema = item;

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
            JsonPointer pointer = JsonPointer.Parse(refKeyword.Reference.ToString());
            IRefResolvable schemaSegment = _schema;
            foreach (PointerSegment segment in pointer.Segments)
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
            WorkList<IJsonSchemaKeyword> keywords = schema.AsWorkList();

            foreach (IJsonSchemaKeyword keyword in keywords)
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
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"[{i}]")), item.Schemas[i], metadata);
                    }

                    break;
                case AnyOfKeyword item:
                    for (var i = 0; i < item.Schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"[{i}]")), item.Schemas[i], metadata);
                    }

                    break;
                case OneOfKeyword item:
                    for (var i = 0; i < item.Schemas.Count; i++)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse($"[{i}]")), item.Schemas[i], metadata);
                    }

                    break;
                case DefinitionsKeyword item:
                    foreach (var (name, definition) in item.Definitions)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse(name)), definition, metadata);
                    }

                    break;
                case DefsKeyword item:
                    foreach (var (name, definition) in item.Definitions)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse(name)), definition, metadata);
                    }

                    break;
                case PropertiesKeyword item:
                    foreach (var (name, definition) in item.Properties)
                    {
                        AnalyzeSchema(path.Combine(JsonPointer.Parse(name)), definition, metadata);
                    }

                    break;
                case ISchemaContainer schemaContainer:
                    AnalyzeSchema(path, schemaContainer.Schema, metadata);
                    break;
            }
        }
    }
}
