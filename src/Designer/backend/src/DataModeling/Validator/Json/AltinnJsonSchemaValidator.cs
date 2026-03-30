using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;
using Json.Schema.Keywords;

namespace Altinn.Studio.DataModeling.Validator.Json
{
    public class AltinnJsonSchemaValidator : IJsonSchemaValidator
    {
        private sealed class ValidationContext
        {
            public ValidationContext(JsonSchema rootSchema)
            {
                RootSchema = rootSchema;
                Issues = new List<JsonSchemaValidationIssue>();
            }

            public JsonSchema RootSchema { get; }
            public List<JsonSchemaValidationIssue> Issues { get; }
        }

        public JsonSchemaValidationResult Validate(JsonNode jsonSchema)
        {
            var schema = JsonSchema.FromText(jsonSchema.ToString(), JsonSchemaKeywords.GetBuildOptions());
            var validationContext = new ValidationContext(schema);

            var rootPath = JsonPointer.Parse("#");

            if (
                schema.HasKeyword<PropertiesKeyword>()
                && (schema.HasKeyword<OneOfKeyword>() || schema.HasKeyword<AllOfKeyword>())
            )
            {
                validationContext.Issues.Add(
                    new JsonSchemaValidationIssue(
                        rootPath.ToString(),
                        JsonSchemaValidationErrorCodes.BothPropertiesAndCompositionSchema
                    )
                );
            }

            foreach (var kd in schema.GetKeywords()!)
            {
                var keywordPath = rootPath.Combine(JsonPointer.Parse($"/{kd.Handler.Name}"));
                ValidateKeyword(keywordPath, kd, validationContext);
            }

            return new JsonSchemaValidationResult(validationContext.Issues);
        }

        private void ValidateKeyword(JsonPointer path, KeywordData kd, ValidationContext validationContext)
        {
            switch (kd.Handler)
            {
                case PropertiesKeyword:
                    ValidatePropertiesKeyword(path, kd, validationContext);
                    break;
                case OneOfKeyword:
                    ValidateOneOfKeyword(path, kd, validationContext);
                    break;
            }
        }

        private void ValidatePropertiesKeyword(
            JsonPointer path,
            KeywordData propertiesKd,
            ValidationContext validationContext
        )
        {
            var properties = propertiesKd.GetPropertiesDictionary();
            foreach ((string name, JsonSchema propertyNode) in properties)
            {
                var propertyPath = path.Combine(JsonPointer.Parse($"/{name}"));
                ValidateSubSchema(propertyPath, propertyNode, validationContext);
            }
        }

        private void ValidateSubSchema(JsonPointer path, JsonSchema subSchema, ValidationContext validationContext)
        {
            if (IsRefType(subSchema))
            {
                var refKd = subSchema.FindKeywordByHandler<RefKeyword>();
                ValidateRefKeyword(path, refKd, validationContext);
                return;
            }

            if (SchemaHasType(subSchema, SchemaValueType.Object))
            {
                ValidateObjectTypeSchema(path, subSchema, validationContext);
                return;
            }

            if (SchemaHasType(subSchema, SchemaValueType.Array))
            {
                ValidateArrayTypeSchema(path, subSchema, validationContext);
            }
        }

        private void ValidateObjectTypeSchema(JsonPointer path, JsonSchema schema, ValidationContext validationContext)
        {
            if (!schema.HasKeyword<PropertiesKeyword>())
            {
                validationContext.Issues.Add(
                    new JsonSchemaValidationIssue(
                        path.ToString(),
                        JsonSchemaValidationErrorCodes.ObjectNodeWithoutProperties
                    )
                );
            }

            foreach (var kd in schema.GetKeywords()!)
            {
                var keywordPath = path.Combine(JsonPointer.Parse($"/{kd.Handler.Name}"));
                ValidateKeyword(keywordPath, kd, validationContext);
            }
        }

        private void ValidateArrayTypeSchema(JsonPointer path, JsonSchema schema, ValidationContext validationContext)
        {
            if (schema.TryGetKeyword<ItemsKeyword>(out var itemsKd))
            {
                var singleSchema = itemsKd.GetSingleSubSchema();
                if (singleSchema is not null)
                {
                    ValidateSubSchema(path.Combine(JsonPointer.Parse("/items")), singleSchema, validationContext);
                }
            }
        }

        private void ValidateOneOfKeyword(JsonPointer path, KeywordData oneOfKd, ValidationContext validationContext)
        {
            var subSchemas = oneOfKd.GetSubSchemas();
            int subSchemaIndex = 0;
            foreach (var subSchema in subSchemas)
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ValidateSubSchema(subSchemaPath, subSchema, validationContext);
                subSchemaIndex++;
            }
        }

        private void ValidateRefKeyword(JsonPointer path, KeywordData refKd, ValidationContext validationContext)
        {
            var refPath = JsonPointer.Parse(refKd.GetRefString());
            var refSchema = validationContext.RootSchema.FollowReference(refPath);

            if (refSchema is null)
            {
                validationContext.Issues.Add(
                    new JsonSchemaValidationIssue(path.ToString(), JsonSchemaValidationErrorCodes.InvalidReference)
                );
                return;
            }

            ValidateSubSchema(refPath, refSchema, validationContext);
        }

        private static bool SchemaHasType(JsonSchema subSchema, SchemaValueType type)
        {
            var typeValue = subSchema.GetSchemaType();
            return typeValue.HasValue && typeValue.Value == type;
        }

        private static bool IsRefType(JsonSchema subSchema)
        {
            return subSchema.HasKeyword<RefKeyword>();
        }
    }
}
