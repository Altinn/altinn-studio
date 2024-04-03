using System.Collections.Generic;
using System.Text.Json.Nodes;
using Altinn.Studio.DataModeling.Utils;
using Json.Pointer;
using Json.Schema;

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
            var schema = JsonSchema.FromText(jsonSchema.ToString());
            var validationContext = new ValidationContext(schema);

            var rootPath = JsonPointer.Parse("#");

            if (schema.HasKeyword<PropertiesKeyword>() && (schema.HasKeyword<OneOfKeyword>() || schema.HasKeyword<AllOfKeyword>()))
            {
                validationContext.Issues.Add(
                    new JsonSchemaValidationIssue(rootPath.ToString(JsonPointerStyle.UriEncoded), JsonSchemaValidationErrorCodes.BothPropertiesAndCompositionSchema)
                    );
            }

            foreach (var keyword in schema.Keywords!)
            {
                var keywordPath = rootPath.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));
                ValidateKeyword(keywordPath, keyword, validationContext);
            }

            return new JsonSchemaValidationResult(validationContext.Issues);
        }

        private void ValidateKeyword(JsonPointer path, IJsonSchemaKeyword keyword, ValidationContext validationContext)
        {
            switch (keyword)
            {
                case PropertiesKeyword propertiesKeyword:
                    ValidatePropertiesKeyword(path, propertiesKeyword, validationContext);
                    break;
                case OneOfKeyword oneOfKeyword:
                    ValidateOneOfKeyword(path, oneOfKeyword, validationContext);
                    break;
            }
        }


        private void ValidatePropertiesKeyword(JsonPointer path, PropertiesKeyword propertiesKeyword, ValidationContext validationContext)
        {
            foreach ((string name, JsonSchema propertyNode) in propertiesKeyword.Properties)
            {
                var propertyPath = path.Combine(JsonPointer.Parse($"/{name}"));
                ValidateSubSchema(propertyPath, propertyNode, validationContext);
            }
        }


        private void ValidateSubSchema(JsonPointer path, JsonSchema subSchema, ValidationContext validationContext)
        {
            if (IsRefType(subSchema))
            {
                ValidateRefKeyword(path, subSchema.GetKeyword<RefKeyword>(), validationContext);
                return;
            }

            // if object type validate
            if (SchemaHasType(subSchema, SchemaValueType.Object))
            {
                ValidateObjectTypeSchema(path, subSchema, validationContext);
                return;
            }

            // if array type validate
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
                    new JsonSchemaValidationIssue(path.ToString(JsonPointerStyle.UriEncoded), JsonSchemaValidationErrorCodes.ObjectNodeWithoutProperties)
                    );
            }

            foreach (var keyword in schema.Keywords!)
            {
                var keywordPath = path.Combine(JsonPointer.Parse($"/{keyword.Keyword()}"));
                ValidateKeyword(keywordPath, keyword, validationContext);
            }
        }

        private void ValidateArrayTypeSchema(JsonPointer path, JsonSchema schema, ValidationContext validationContext)
        {
            if (schema.TryGetKeyword(out ItemsKeyword itemsKeyword) && itemsKeyword.SingleSchema is not null)
            {
                ValidateSubSchema(path.Combine(JsonPointer.Parse("/items")), itemsKeyword.SingleSchema, validationContext);
            }
        }

        private void ValidateOneOfKeyword(JsonPointer path, OneOfKeyword oneOfKeyword, ValidationContext validationContext)
        {
            int subSchemaIndex = 0;
            foreach (var subSchema in oneOfKeyword.Schemas)
            {
                var subSchemaPath = path.Combine(JsonPointer.Parse($"/[{subSchemaIndex}]"));
                ValidateSubSchema(subSchemaPath, subSchema, validationContext);
                subSchemaIndex++;
            }
        }

        private void ValidateRefKeyword(JsonPointer path, RefKeyword refKeyword, ValidationContext validationContext)
        {
            var refPath = JsonPointer.Parse(refKeyword.Reference.ToString());
            var refSchema = validationContext.RootSchema.FollowReference(refPath);

            if (refSchema is null)
            {
                validationContext.Issues.Add(
                    new JsonSchemaValidationIssue(path.ToString(JsonPointerStyle.UriEncoded), JsonSchemaValidationErrorCodes.InvalidReference)
                    );
                return;
            }

            ValidateSubSchema(refPath, refSchema, validationContext);
        }

        private static bool SchemaHasType(JsonSchema subSchema, SchemaValueType type)
        {
            if (subSchema.TryGetKeyword(out TypeKeyword typeKeyword))
            {
                return typeKeyword.Type == type;
            }
            return false;
        }

        private static bool IsRefType(JsonSchema subSchema)
        {
            return subSchema.HasKeyword<RefKeyword>();
        }
    }
}
