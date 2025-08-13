using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class InstantiationHandler : IInstantiationProcessor, IInstantiationValidator
    {
        private readonly IProfile _profileService;
        private readonly IRegister _registerService;

        public InstantiationHandler(IProfile profileService, IRegister registerService)
        {
            _profileService = profileService;
            _registerService = registerService;
        }

#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously
        public async Task<InstantiationValidationResult> Validate(Instance instance)
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
        {
            DateTime now = DateTime.Now;
#pragma warning disable IDE0046 // Convert to conditional expression
            if (now.Hour < 15)
            {
                return new InstantiationValidationResult()
                {
                    Valid = false,
                    Message = "ERROR: Instantiation not possible before 3PM."
                };
            }
#pragma warning restore IDE0046 // Convert to conditional expression

            return null;
        }

        /// <summary>
        /// Run events related to instantiation
        /// </summary>
        /// <remarks>
        /// For example custom prefill.
        /// </remarks>
        /// <param name="instance">The instance object</param>
        /// <param name="data">The data created</param>
        /// <param name="prefill">Prefill data</param>
#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously
        public async Task DataCreation(Instance instance, object data, Dictionary<string, string> prefill)
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
        {
            if (data.GetType() == typeof(Skjema))
            {
                var model = (Skjema)data;
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
        }
    }
}
