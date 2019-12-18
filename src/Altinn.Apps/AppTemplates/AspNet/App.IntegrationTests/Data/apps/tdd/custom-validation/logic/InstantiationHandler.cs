using System;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
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
        /// <param name="validationResults"></param>
        /// <returns>The validation result object (null if no errors) </returns>
        public InstantiationValidationResult RunInstantiationValidation(Instance instance)
        {
            DateTime now = DateTime.Now;
            if (now.Hour < 15)
            {
                return new InstantiationValidationResult()
                {
                    Valid = false,
                    Message = "ERROR: Instantiation not possible before 3PM."
                };
            }

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
        public void DataCreation(Instance instance, object data)
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
        }
    }
}
