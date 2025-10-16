using Altinn.App.Core.Features;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.App.logic.DataProcessing
{
    public class InstantiationProcessor : IInstantiationProcessor
    {
        public async Task DataCreation(Instance instance, object datamodel, Dictionary<string, string> prefill)
        {
            if (datamodel.GetType() == typeof(data))
            {
                data model = (data)datamodel;
                model.form.year = DateTime.Now.Year - 1;
            } 

            await Task.CompletedTask;
        }
    }
}
