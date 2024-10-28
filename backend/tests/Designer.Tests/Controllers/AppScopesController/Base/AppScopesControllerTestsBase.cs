using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Designer.Tests.Controllers.AppScopesController.Base;

public class AppScopesControllerTestsBase<TControllerTest> : DbDesignerEndpointsTestsBase<TControllerTest>
where TControllerTest : class
{
    public AppScopesControllerTestsBase(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture) : base(factory, designerDbFixture)
    {
        JsonConfigOverrides.Add($@"
              {{
                    ""FeatureManagement"": {{
                        ""AnsattPorten"": true
                    }}
             }}
            ");
    }
}
