using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
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
        private readonly IDataClient _dataClient;

        public InstantiationProcessor(IAltinnPartyClient registerService, IDataClient dataClient)
        {
            _registerService = registerService;
            _dataClient = dataClient;
        }

        public async Task DataCreation(
            Instance instance,
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

            // Create the shared model when the first model (modell1) is auto-created
            if (data.GetType() == typeof(modell1))
            {
                FormDataHelper formDataHelper = new FormDataHelper(instance, _dataClient);
                await formDataHelper.InsertFormData(new sharedperson());
            }
        }
    }
}
