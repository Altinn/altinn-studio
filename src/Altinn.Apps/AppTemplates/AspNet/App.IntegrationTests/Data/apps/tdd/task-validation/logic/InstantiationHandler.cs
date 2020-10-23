using System;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.task_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class InstantiationHandler
    {
        private IProfile _profileService;
        private IRegister _registerService;

        public InstantiationHandler(IProfile profileService, IRegister registerService)
        {
            _profileService = profileService;
            _registerService = registerService;
        }

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
