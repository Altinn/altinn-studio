using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAppTemplatePackageVersionService
{
    Task<string> GetLatestStableAppPackageVersion(CancellationToken cancellationToken = default);
}
