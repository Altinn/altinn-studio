using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.AppLogic.DataProcessing;

public class ValidateQueryParamPrefill : IValidateQueryParamPrefill
{
    public async Task<ValidationIssue?> PrefillFromQueryParamsIsValid(Dictionary<string, string> prefill)
    {
        if (prefill.ContainsKey("JobTitle"))
        {
            // No validation issue -> return null
            await Task.CompletedTask;
            return null;
        }

        // If it's invalid, you can either throw or return a ValidationIssue:
        throw new Exception("Tried to write invalid data via query params");

        // Alternatively, return a ValidationIssue instead of throwing:
        // return new ValidationIssue
        // {
        //     Severity = ValidationIssueSeverity.Error,
        //     Description = "Tried to write invalid data via query params",
        // };
    }
}