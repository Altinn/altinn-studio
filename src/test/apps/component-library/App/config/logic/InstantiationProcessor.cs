using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Models.Model;

namespace Altinn.App.logic.DataProcessing
{
    public class InstantiationProcessor : IInstantiationProcessor
    {
        private IAltinnPartyClient _registerService;

        public InstantiationProcessor(IAltinnPartyClient registerService)
        {
            _registerService = registerService;
        }

        public async Task DataCreation(Instance instance, object data, Dictionary<string, string> prefill)
        {

            if (data.GetType() == typeof(Model))
            {
                var model = (Model)data;
                model.LikertExample = new List<LikertQuestion>
                {
                    new() { Id = "question-1", Answer = "" },
                    new() { Id = "question-2", Answer = "" },
                    new() { Id = "question-3", Answer = "" },
                    new() { Id = "question-4", Answer = "" },
                    new() { Id = "question-5", Answer = "" },
                    new() { Id = "question-6", Answer = "" }
                };
            }

            await Task.CompletedTask;
        }

    }
}
