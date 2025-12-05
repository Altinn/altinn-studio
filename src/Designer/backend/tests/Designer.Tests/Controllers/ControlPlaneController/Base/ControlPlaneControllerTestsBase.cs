using Altinn.Studio.Designer.Constants;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Designer.Tests.Controllers.ControlPlaneController.Base;

public class ControlPlaneControllerTestsBase<TControllerTest> : DesignerEndpointsTestsBase<TControllerTest>
    where TControllerTest : class
{
    protected const string RequiredScope = "altinn:studio/designer";

    public ControlPlaneControllerTestsBase(WebApplicationFactory<Program> factory) : base(factory)
    {
        JsonConfigOverrides.Add(
            $$"""
                 {
                       "FeatureManagement": {
                           "{{StudioFeatureFlags.Maskinporten}}": true
                       },
                       "Maskinporten": {
                           "MetadataAddresses": ["http://localhost/.well-known/oauth-authorization-server"],
                           "RequiredScope": "{{RequiredScope}}"
                       }
                 }
              """);
    }
}
