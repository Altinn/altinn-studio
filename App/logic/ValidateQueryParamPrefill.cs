using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.logic;

public class ValidateQueryParamPrefill : IValidateQueryParamPrefill
{
    public async Task<ValidationIssue?> PrefillFromQueryParamsIsValid(Dictionary<string, string> prefill)
    {
        if (prefill.ContainsKey("JobTitle"))
        {
            await Task.CompletedTask;
            return null;
        }
        
        throw new Exception("Tried to write invalid data via query params");
    }
}