using Altinn.App.Core.Features;
using Altinn.App.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
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

                model.MapData = new() { Location = "", Geometries = new List<Geometry>(), };
                model.MapData.Geometries.Add(new() { Label = "Hankabakken 1", Data = "POLYGON ((16.1096835728424 67.1452365035596,16.1190491078039 67.1451712353654,16.118841539588 67.1406869499763,16.109477740932 67.1407522039498,16.1096835728424 67.1452365035596))" });
                model.MapData.Geometries.Add(new() { Label = "Hankabakken 2", Data = "POLYGON ((16.0844471059834 67.1454096440408,16.1096835728424 67.1452365035596,16.1096284017344 67.1440347115437,16.0843931889725 67.1442078419132,16.0844471059834 67.1454096440408))" });
                model.MapData.Geometries.Add(new() { Label = "Hankabakken 3", Data = "POLYGON ((16.0843931889725 67.1442078419132,16.0914055727082 67.1441601320718,16.0912573849201 67.1408776044743,16.0842459528488 67.1409253067063,16.0843931889725 67.1442078419132))" });
                model.MapData.Geometries.Add(new() { Label = "Hankabakken 4", Data = "POLYGON ((16.091294225332 67.1416937521884,16.1095151961509 67.1415683466908,16.109477740932 67.1407522039498,16.0912573849201 67.1408776044743,16.091294225332 67.1416937521884))" });
                model.MapData.Geometries.Add(new() { Label = "Hankabakken 5", Data = "POLYGON ((16.0957778974798 67.1408466860878,16.118841539588 67.1406869499763,16.1186340551949 67.1362026617326,16.0955746880334 67.1363623630455,16.0957778974798 67.1408466860878))" });
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
