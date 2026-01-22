#nullable enable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IStudioctlInstallScriptService
{
    Task<StudioctlInstallScriptResult> GetInstallScriptAsync(
        StudioctlInstallScriptType scriptType,
        CancellationToken cancellationToken);
}
