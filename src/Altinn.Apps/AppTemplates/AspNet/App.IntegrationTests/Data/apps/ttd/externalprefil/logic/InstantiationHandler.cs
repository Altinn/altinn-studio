using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

//// using Altinn.App.Models; // Uncomment this line to refer to app model(s)

namespace App.IntegrationTests.Mocks.Apps.Ttd.Externalprefil
{
    /// <summary>
    /// Represents a business logic class responsible for running logic related to instantiation.
    /// </summary>
    public class InstantiationHandler
    {
        private IProfile _profileService;
        private IRegister _registerService;

        /// <summary>
        /// Initialize a new instance of the <see cref="InstantiationHandler"/> class with services
        /// that can be used to access profile and register information.
        /// </summary>
        /// <param name="profileService">A service with access to profile information</param>
        /// <param name="registerService">A service with access to register information</param>
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
        /// <param name="instance">The instance being validated</param>
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
        public async Task DataCreation(Instance instance, object data)
        {
            await Task.CompletedTask;
        }
    }
}
