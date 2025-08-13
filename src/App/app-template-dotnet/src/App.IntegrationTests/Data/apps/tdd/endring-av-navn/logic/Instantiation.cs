using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class Instantiation: IInstantiationProcessor
    {

        public async Task DataCreation(Instance instance, object data, Dictionary<string, string> prefill)
        {
            if (data is App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn.Skjema)
            {
                Skjema skjema = (Skjema)data;
                skjema.Begrunnelsegrp9317 = new Begrunnelsegrp9317();
                skjema.Begrunnelsegrp9317.BegrunnelseForNyttNavngrp9318 = new BegrunnelseForNyttNavngrp9318();
                skjema.Begrunnelsegrp9317.BegrunnelseForNyttNavngrp9318.PersonFornavnAnnetBegrunnelsedatadef34948 = new PersonFornavnAnnetBegrunnelsedatadef34948() { value = "Fordi det er en enhetstest" };
            }

            await Task.CompletedTask;
        }
    }
}
