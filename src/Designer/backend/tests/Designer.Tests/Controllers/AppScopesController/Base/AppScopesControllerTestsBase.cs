using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Controllers.AppScopesController.Utils;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Designer.Tests.Controllers.AppScopesController.Base;

public class AppScopesControllerTestsBase<TControllerTest> : DbDesignerEndpointsTestsBase<TControllerTest>
where TControllerTest : class
{
    public AppScopesControllerTestsBase(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture) : base(factory, designerDbFixture)
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

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);

        // Replace test authentication handler with Ansattporten-specific test handler
        services.PostConfigure<Microsoft.AspNetCore.Authentication.AuthenticationOptions>(options =>
        {
            var testScheme = options.Schemes.FirstOrDefault(s => s.Name == TestAuthConstants.TestAuthenticationScheme);
            if (testScheme != null)
            {
                testScheme.HandlerType = typeof(TestAnsattPortenAuthHandler);
            }
        });

        var environmentsServiceMock = new Mock<IEnvironmentsService>();
        environmentsServiceMock
            .Setup(x => x.GetAltinnOrg(It.IsAny<string>()))
            .ReturnsAsync((string org) =>
            {
                var orgModel = new AltinnOrgModel
                {
                    OrgNr = "991825827",
                    Name = new Dictionary<string, string> { { "nb", org == "ttd" ? "Testdepartementet" : "Test Org" } },
                    Environments = new List<string> { "test" }
                };
                return orgModel;
            });

        services.AddSingleton(environmentsServiceMock.Object);
    }
}
