using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Implementation;

public class LayoutReferenceUpdater(
    IAppVersionService appVersionService,
    IUiFoldersService uiFoldersService,
    IAppDevelopmentService appDevelopmentService
) : ILayoutReferenceUpdater
{
    public async Task<bool> UpdateLayoutReferences(
        AltinnRepoEditingContext editingContext,
        List<Reference> referencesToUpdate,
        CancellationToken cancellationToken
    ) =>
        IsV9App(editingContext)
            ? await uiFoldersService.UpdateLayoutReferences(editingContext, referencesToUpdate, cancellationToken)
            : await appDevelopmentService.UpdateLayoutReferences(editingContext, referencesToUpdate, cancellationToken);

    private bool IsV9App(AltinnRepoEditingContext editingContext)
    {
        try
        {
            SemanticVersion version = appVersionService.GetAppLibVersion(editingContext);
            return version != null && version.Major >= 9;
        }
        catch (FileNotFoundException)
        {
            return true;
        }
    }
}
