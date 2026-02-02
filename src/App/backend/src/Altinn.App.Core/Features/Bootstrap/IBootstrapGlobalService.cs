using Altinn.App.Core.Features.Bootstrap.Models;

namespace Altinn.App.Core.Features.Bootstrap;

internal interface IBootstrapGlobalService
{
    Task<BootstrapGlobalResponse> GetGlobalState(string? redirectUrl);
}
