using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using App.IntegrationTests.Mocks.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Api.Tests.Mocks;

public class AppMetadataMockTests
{
    [Fact]
    public async Task WithoutRequest_ReadsConfiguredAppAndAppliesMutationHooks()
    {
        var features = new Mock<IFrontendFeatures>();
        features.Setup(x => x.GetFrontendFeatures()).ReturnsAsync(new Dictionary<string, bool> { ["probe"] = true });
        var mutationCalls = 0;
        var metadata = new AppMetadataMock(
            Options.Create(new AppSettings { AppBasePath = TestData.GetApplicationDirectory("tdd", "demo-app") }),
            features.Object,
            new HttpContextAccessor(),
            [new AppMetadataMutationHook(_ => mutationCalls++)]
        );

        var application = await metadata.GetApplicationMetadata();

        Assert.Equal("tdd/demo-app", application.Id);
        Assert.NotNull(application.Features);
        Assert.True(application.Features["probe"]);
        Assert.Equal(1, mutationCalls);
        Assert.Same(application, await metadata.GetApplicationMetadata());
        Assert.Equal(1, mutationCalls);
    }

    [Fact]
    public async Task WithRequest_PreservesRequestAppRouting()
    {
        var features = new Mock<IFrontendFeatures>();
        features.Setup(x => x.GetFrontendFeatures()).ReturnsAsync(new Dictionary<string, bool>());
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost");
        context.Request.Path = "/tdd/demo-app/api/v1/applicationmetadata";
        var accessor = new HttpContextAccessor { HttpContext = context };
        try
        {
            var metadata = new AppMetadataMock(
                Options.Create(
                    new AppSettings { AppBasePath = TestData.GetApplicationDirectory("tdd", "contributer-restriction") }
                ),
                features.Object,
                accessor,
                []
            );

            var application = await metadata.GetApplicationMetadata();

            Assert.Equal("tdd/demo-app", application.Id);
        }
        finally
        {
            accessor.HttpContext = null;
        }
    }
}
