using System.Reflection;
using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Xunit;
using RepositoryControllerType = Altinn.Studio.Designer.Controllers.RepositoryController;

namespace Designer.Tests.Controllers.RepositoryController;

public class SearchAuthMetadataTests
{
    [Fact]
    public void Search_AllowsApiKeyAuthentication()
    {
        MethodInfo method = typeof(RepositoryControllerType).GetMethod(nameof(RepositoryControllerType.Search));

        Assert.NotNull(method);
        Assert.NotNull(method.GetCustomAttribute<AllowApiKeyAttribute>());
    }
}
