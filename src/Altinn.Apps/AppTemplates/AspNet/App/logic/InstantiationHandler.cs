using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

using Altinn.App.Services.Interface;
// using Altinn.App.Models; // Uncomment this line to refer to app model(s)

namespace Altinn.App.AppLogic
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
        /// <param name="instance"></param>
        /// <param name="validationResults"></param>
        public void RunInstantiationValidation(object instance, ICollection<ValidationResult> validationResults)
        {

        }

        /// <summary>
        /// Run events related to instantiation
        /// </summary>
        /// <remarks>
        /// For example custom prefill.
        /// </remarks>
        /// <param name="instance"></param>
        public void RunInstantiationEvents(object instance)
        {

        }
    }
}
