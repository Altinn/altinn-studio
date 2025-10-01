using Altinn.App.Core.Features.Cache;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;

namespace App.IntegrationTests.Mocks.Services;

public sealed class AppConfigurationCacheMock(IAppMetadata appMetadata) : IAppConfigurationCache
{
    private readonly IAppMetadata _appMetadata = appMetadata;

    public ApplicationMetadata ApplicationMetadata => _appMetadata.GetApplicationMetadata().GetAwaiter().GetResult();
}
