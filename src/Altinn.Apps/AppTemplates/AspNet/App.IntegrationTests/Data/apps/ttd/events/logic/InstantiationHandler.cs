using System;
using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace App.IntegrationTests.Mocks.Apps.ttd.events
{
    public class InstantiationHandler
    {
        private IProfile _profileService;
        private IRegister _registerService;

        /// <summary>
        /// Set up access to profile and register services
        /// </summary>
        /// <param name="profileService"></param>
        /// <param name="registerService"></param>
        public InstantiationHandler(IProfile profileService, IRegister registerService)
        {
            _profileService = profileService;
            _registerService = registerService;
        }

        /// <summary>
        /// Run validations related to instantiation
        /// </summary>
        /// <example>
        /// if ([some condition])
        /// {
        ///     return new ValidationResult("[error message]");
        /// }
        /// return null;
        /// </example>
        /// <param name="instance"></param>
        /// <returns>The validation result object (null if no errors) </returns>
        public async Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance)
        {
            return await Task.FromResult((InstantiationValidationResult)null);
        }

        /// <summary>
        /// Run events related to instantiation
        /// </summary>
        /// <remarks>
        /// For example custom prefill.
        /// </remarks>
        /// <param name="instance">The instance object</param>
        /// <param name="data">The data created</param>
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
