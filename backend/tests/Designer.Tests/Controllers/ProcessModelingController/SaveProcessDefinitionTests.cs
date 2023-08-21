using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class SaveProcessDefinitionTests: DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.ProcessModelingController, SaveProcessDefinitionTests>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/process-modelling/process-definition";

        public SaveProcessDefinitionTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ProcessModelingController> factory) : base(factory)
        {
        }


    }
}
