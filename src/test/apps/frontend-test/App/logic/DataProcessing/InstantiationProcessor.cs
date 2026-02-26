using Altinn.App.Core.Features;
using Altinn.App.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Actions;
using Altinn.App.Core.Internal.Registers;

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
            if (data.GetType() == typeof(Skjema))
            {
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

                var selectedGeometries = "1,2,3,4,5,6,7,8";
                model.MapData = new() { Location = "", Geometries = GeometryData.GetGeometryData(selectedGeometries), Selected = selectedGeometries };

                ConflictingOptionsReset.SetDefaultData(model);
            }

            if (data.GetType() == typeof(NestedGroup))
            {
                NestedGroup model = (NestedGroup)data;
                model.hideRowValue = 99999999;
            }

            if (data.GetType() == typeof(LikertSurvey))
            {
                var survey = data as LikertSurvey;

                survey.Questions = new List<Question>
                {
                    new Question { Id = "question-1", Answer = "" },
                    new Question { Id = "question-2", Answer = "" },
                    new Question { Id = "question-3", Answer = "" },
                    new Question { Id = "question-4", Answer = "" },
                    new Question { Id = "question-5", Answer = "" },
                    new Question { Id = "question-6", Answer = "" }
                };
            }

            await Task.CompletedTask;
        }
    }
}
