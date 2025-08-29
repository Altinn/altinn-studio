using System.Collections.Generic;

namespace Altinn.Studio.DataModeling.Validator.Json
{
    public class JsonSchemaValidationResult
    {
        public IReadOnlyList<JsonSchemaValidationIssue> ValidationIssues { get; }

        public JsonSchemaValidationResult(List<JsonSchemaValidationIssue> validationIssues)
        {
            ValidationIssues = validationIssues;
        }

        public bool IsValid => ValidationIssues.Count == 0;

    }
}
