using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IUiFoldersService
{
    public Task<IEnumerable<UiFolderLayoutSetDto>> GetLayoutSets(
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<UiFolderLayoutSetDto>> AddLayoutSet(
        AltinnRepoEditingContext editingContext,
        LayoutSetConfig newLayoutSet,
        TaskType? taskType,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<UiFolderLayoutSetDto>> UpdateLayoutSetName(
        AltinnRepoEditingContext editingContext,
        string oldLayoutSetName,
        string newLayoutSetName,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<UiFolderLayoutSetDto>> DeleteLayoutSet(
        AltinnRepoEditingContext editingContext,
        string layoutSetToDeleteId,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<UiFolderLayoutSetDto>> GetLayoutSetsExtended(
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken
    );

    public Task<ValidationOnNavigation?> GetGlobalValidationOnNavigation(
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<ValidationOnNavigationDto>> GetLayoutSetsValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<PageValidationOnNavigationDto>> GetPagesValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    );

    public Task SaveGlobalValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        ValidationOnNavigation? config,
        CancellationToken cancellationToken
    );

    public Task SaveLayoutSetsValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        IEnumerable<ValidationOnNavigationDto> settings,
        CancellationToken cancellationToken
    );

    public Task SavePagesValidationOnNavigation(
        AltinnRepoEditingContext editingContext,
        IEnumerable<PageValidationOnNavigationDto> settings,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<TaskNavigationGroupDto>> GetGlobalTaskNavigationDto(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    );

    public Task UpdateGlobalTaskNavigation(
        AltinnRepoEditingContext editingContext,
        IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Update layout references
    /// </summary>
    /// <param name="editingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
    /// <param name="referencesToUpdate">The references to update.</param>
    /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<bool> UpdateLayoutReferences(
        AltinnRepoEditingContext editingContext,
        List<Reference> referencesToUpdate,
        CancellationToken cancellationToken
    );
}
