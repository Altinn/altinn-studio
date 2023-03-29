using Altinn.App.Core.Features;
using Altinn.App.Core.Interface;
using Altinn.App.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Extensions.Logging;

using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.App.logic.DataProcessing
{
    public class InstantiationProcessor : IInstantiationProcessor
    {
        private IRegister _registerService;
        private ILogger<IInstantiationProcessor> _logger;

        public InstantiationProcessor(IRegister registerService, ILogger<IInstantiationProcessor> logger)
        {
            _registerService = registerService;
            _logger = logger;

        }

        public async Task DataCreation(Instance instance, object data, Dictionary<string, string> prefill)
        {
            if (data.GetType() == typeof(Skjema))
            {
                _logger.LogDebug("// Logged debug");
                _logger.LogInformation("// Logged information");
                _logger.LogWarning("// Logged warning");
                _logger.LogError("// Logged error");
                _logger.LogCritical("// Logged critical");

                Skjema model = (Skjema)data;
                int partyId;
                if (int.TryParse(instance.InstanceOwner.PartyId, out partyId))
                {
                    Party party = await _registerService.GetParty(partyId);
                    model.Innledninggrp9309 = new Innledninggrp9309()
                    {
                        Kontaktinformasjongrp9311 = new Kontaktinformasjongrp9311()
                        {
                            MelderFultnavn = new MelderFultnavn()
                            {
                                value = party.Name
                            }
                        }
                    };
                }
            }

            if (data.GetType() == typeof(LikertSurvey))
            {
                var survey = data as LikertSurvey;

                survey.Questions = new List<Question>
                {
                    new Question
                    {
                        Id = "question-1",
                        Answer = ""
                    },
                    new Question
                    {
                        Id = "question-2",
                        Answer = ""
                    },
                    new Question
                    {
                        Id = "question-3",
                        Answer = ""
                    },
                    new Question
                    {
                        Id = "question-4",
                        Answer = ""
                    },
                    new Question
                    {
                        Id = "question-5",
                        Answer = ""
                    },
                    new Question
                    {
                        Id = "question-6",
                        Answer = ""
                    }
                };
            }

            await Task.CompletedTask;
        }
    }
}
