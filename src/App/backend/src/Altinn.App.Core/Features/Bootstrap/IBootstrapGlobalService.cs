using Altinn.App.Core.Features.Bootstrap.Models;

namespace Altinn.App.Core.Features.Bootstrap;

public interface IBootstrapGlobalService
{
    Task<BootstrapGlobalResponse> GetGlobalState();
}
