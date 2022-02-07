using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.sirius.AppLogic
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

        public async Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance)
        {
            return await Task.FromResult((InstantiationValidationResult)null);
        }

        public async Task DataCreation(Instance instance, object data)
        {
            await Task.CompletedTask;
        }
    }
}
