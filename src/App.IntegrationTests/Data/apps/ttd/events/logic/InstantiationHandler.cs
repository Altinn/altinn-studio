using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.ttd.events
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class InstantiationHandler
    {
        private IProfile _profileService;
        private IRegister _registerService;

        /// <summary>
        /// Set up access to profile and register services
        /// </summary>
        /// <param name="profileService">The profile service</param>
        /// <param name="registerService">The register service</param>
        public InstantiationHandler(IProfile profileService, IRegister registerService)
        {
            _profileService = profileService;
            _registerService = registerService;
        }

        public async Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance)
        {
            return await Task.FromResult((InstantiationValidationResult)null);
        }

        public async Task DataCreation(Instance instance, object data)
        {
            if (data.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)data;
                string name = "Test Test 123";

                if (model.Foretakgrp8820 == null)
                {
                    model.Foretakgrp8820 = new Foretakgrp8820()
                    {
                        EnhetNavnEndringdatadef31 = new EnhetNavnEndringdatadef31()
                        {
                            orid = 31,
                            value = name
                        }
                    };
                }
                else if (model.Foretakgrp8820.EnhetNavnEndringdatadef31 == null)
                {
                    model.Foretakgrp8820.EnhetNavnEndringdatadef31 = new EnhetNavnEndringdatadef31()
                    {
                        orid = 31,
                        value = name
                    };
                }
                else
                {
                    model.Foretakgrp8820.EnhetNavnEndringdatadef31.value = name;
                }
            }

            await Task.CompletedTask;
        }
    }
}
