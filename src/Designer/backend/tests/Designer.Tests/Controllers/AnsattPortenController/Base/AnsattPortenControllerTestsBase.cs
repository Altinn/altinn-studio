using Altinn.Studio.Designer.Constants;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Designer.Tests.Controllers.AnsattPortenController.Base;

public class AnsattPortenControllerTestsBase<TControllerTest> : DesignerEndpointsTestsBase<TControllerTest> where TControllerTest : class
{
    public AnsattPortenControllerTestsBase(WebApplicationFactory<Program> factory) : base(factory)
    {
        JsonConfigOverrides.Add(
            $$"""
                 {
                       "FeatureManagement": {
                           "{{StudioFeatureFlags.AnsattPorten}}": true
                       },
                       "AnsattPortenLoginSettings": {
                           "ClientId": "non-empty-for-testing",
                           "ClientSecret": "non-empty-for-testing"
                       }
                 }
              """);
    }
}
