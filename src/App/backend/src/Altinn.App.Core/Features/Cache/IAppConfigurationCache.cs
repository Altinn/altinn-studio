using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Cache;

internal interface IAppConfigurationCache
{
    public ApplicationMetadata ApplicationMetadata { get; }
}
