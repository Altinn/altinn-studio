using Altinn.App.Models;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using System.Threading.Tasks;
using Altinn.Platform.Register.Models;
using System.Collections.Generic;

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
        /// <param name="instance">Instance information</param>
        /// <param name="data">The data object created</param>
        /// <param name="prefill">External prefill available under instansiation if supplied</param>
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
            }

            await Task.CompletedTask;
        }
    }
}
