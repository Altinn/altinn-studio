using Altinn.Studio.Designer.Models;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAppVersionService
{
    SemanticVersion GetAppLibVersion(AltinnRepoEditingContext altinnRepoEditingContext);
}
