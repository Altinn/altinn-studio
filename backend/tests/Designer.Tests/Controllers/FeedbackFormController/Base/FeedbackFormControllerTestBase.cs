
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Designer.Tests.Controllers.FeedbackFormController.Base;

public class FeedbackFormControllerTestBase<TControllerTest> : DesignerEndpointsTestsBase<TControllerTest>
    where TControllerTest : class
{
    public FeedbackFormControllerTestBase(WebApplicationFactory<Program> factory) : base(factory)
    {
        JsonConfigOverrides.Add(
            $$"""
                     {
                           "GeneralSettings": {
                               "HostName": "TestHostName"
                           }
                     }
                  """);
    }
}
