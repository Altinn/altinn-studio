using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

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
        appVersionService.IsV9App(editingContext)
            ? await uiFoldersService.UpdateLayoutReferences(editingContext, referencesToUpdate, cancellationToken)
            : await appDevelopmentService.UpdateLayoutReferences(editingContext, referencesToUpdate, cancellationToken);
}
