using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.App.Core.Features;


namespace Altinn.App.AppLogic.DataProcessing;

public class ValidateQueryParamPrefill : IValidateQueryParamPrefill
{


    public async Task PrefillFromQueryParamsIsValid(Dictionary<string, string> prefill)
    {
        Debugger.Break();
        if (prefill.ContainsKey("JobTitle"))
        {
            await Task.CompletedTask;
            return;
        }

        throw new Exception("Tried to write invalid data via query params");
    }
}