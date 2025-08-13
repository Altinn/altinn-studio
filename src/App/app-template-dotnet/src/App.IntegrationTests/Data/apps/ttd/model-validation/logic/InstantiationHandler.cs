using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.ttd.model_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class InstantiationHandler: IInstantiationValidator, IInstantiationProcessor
    {
        private IProfile _profileService;
        private IRegister _registerService;

        public InstantiationHandler(IProfile profileService, IRegister registerService)
        {
            _profileService = profileService;
            _registerService = registerService;
        }

        public async Task<InstantiationValidationResult> Validate(Instance instance)
        {
            DateTime now = DateTime.Now;
            if (now.Hour < 15)
            {
                return await Task.FromResult(new InstantiationValidationResult()
                {
                    Valid = false,
                    Message = "ERROR: Instantiation not possible before 3PM."
                });
            }

            return await Task.FromResult((InstantiationValidationResult)null);
        }

        public async Task DataCreation(Instance instance, object data, Dictionary<string, string> prefill)
        {
            if (data.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)data;
                string navn = "Test Test 123";

                if (model.Foretakgrp8820 == null)
                {
                    model.Foretakgrp8820 = new Foretakgrp8820()
                    {
                        EnhetNavnEndringdatadef31 = new EnhetNavnEndringdatadef31()
                        {
                            orid = 31,
                            value = navn
                        }
                    };
                }
                else if (model.Foretakgrp8820.EnhetNavnEndringdatadef31 == null)
                {
                    model.Foretakgrp8820.EnhetNavnEndringdatadef31 = new EnhetNavnEndringdatadef31()
                    {
                        orid = 31,
                        value = navn
                    };
                }
                else
                {
                    model.Foretakgrp8820.EnhetNavnEndringdatadef31.value = navn;
                }
            }

            await Task.CompletedTask;
        }
    }
}
