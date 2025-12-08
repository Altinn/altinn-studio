using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Models;

#nullable enable

namespace Altinn.App.Logic.ConvertedLegacyRules;

public class GroupDataProcessor : IDataWriteProcessor
{
    public async Task ProcessDataWrite(
        IInstanceDataMutator instanceDataMutator,
        string taskId,
        DataElementChanges changes,
        string? language)
    {
        var change = changes.FormDataChanges.FirstOrDefault(c => c.CurrentFormData is NestedGroup);
        if (change == null)
        {
            return;
        }

        var wrapper = change.CurrentFormDataWrapper;

        await Rule_cheatinprefillvaluesshadow(wrapper);
    }

    private async Task Rule_cheatinprefillvaluesshadow(IFormDataWrapper wrapper)
    {
        // Rule configuration:
        //   SelectedFunction: copyToPrefillShadow
        //   InputParams:
        //     values = PrefillValues
        //     shadow = PrefillValuesShadow
        //     enabled = PrefillValuesEnabled
        //   OutParams:
        //     outParam0 = PrefillValuesShadow

        // Original JavaScript function: copyToPrefillShadow
        // (function (obj) {
        //     const enabled = obj.enabled === 'true' || obj.enabled === true || obj.enabled === undefined || obj.enabled === null;
        //     return enabled ? obj.shadow : obj.values;
        //   })

        var values = (string?)wrapper.Get("PrefillValues");
        var shadow = (string?)wrapper.Get("PrefillValuesShadow");
        var enabled = (bool?)wrapper.Get("PrefillValuesEnabled");

        enabled = enabled == "true" || enabled == true || enabled == null || enabled == null;
        wrapper.Set("PrefillValuesShadow", enabled ? shadow : values);
        await Task.CompletedTask;
    }

}
