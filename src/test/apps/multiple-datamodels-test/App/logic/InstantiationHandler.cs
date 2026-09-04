using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Models;
using Altinn.App.Models.modell1;
using Altinn.App.Models.modell2;
using Altinn.App.Models.sharedperson;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic.DataProcessing
{
    public class InstantiationProcessor : IInstantiationProcessor
    {
        private readonly IAltinnPartyClient _registerService;

        public InstantiationProcessor(IAltinnPartyClient registerService)
        {
            _registerService = registerService;
        }

        public Task DataCreation(Instance instance, object data, Dictionary<string, string> prefill)
        {
            return Task.CompletedTask;
        }

        public Task DataCreation(
            IInstanceDataMutator instanceDataMutator,
            object data,
            Dictionary<string, string> prefill
        )
        {
            if (data.GetType() == typeof(modell2))
            {
                var form = data as modell2;

                form.questions = new List<questions>
                {
                    new questions { Id = "question-1", Answer = "" },
                    new questions { Id = "question-2", Answer = "" },
                    new questions { Id = "question-3", Answer = "" },
                };
            }

            if (data.GetType() == typeof(modell1))
            {
                instanceDataMutator.AddFormDataElement("sharedperson", new sharedperson());
            }

            return Task.CompletedTask;
        }
    }
}
