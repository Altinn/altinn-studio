using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Updating or removing references to tasks, layouts, components and layout sets.
/// Routes to the v8 (<see cref="IAppDevelopmentService"/>) or v9 (<see cref="IUiFoldersService"/>)
/// </summary>
public interface ILayoutReferenceUpdater
{
    Task<bool> UpdateLayoutReferences(
        AltinnRepoEditingContext editingContext,
        List<Reference> referencesToUpdate,
        CancellationToken cancellationToken
    );
}
