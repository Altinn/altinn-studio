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

    /// <summary>
    /// Validates that a process task can be renamed. A task whose layout set folder carries its id can only
    /// take a new id that the layout set could also be renamed to.
    /// </summary>
    public Task ValidateTaskIdChange(
        AltinnRepoEditingContext editingContext,
        string oldTaskId,
        string newTaskId,
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

    /// <summary>
    /// Lists the Subform components on every page of the layout sets that are not subforms, with the layout
    /// set and default data type of the subform each one opens.
    /// </summary>
    public Task<IEnumerable<SubformComponentDto>> GetSubformComponents(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Makes the pages of a subform PDF task hold a hidden copy of a Subform component, which the task renders
    /// its PDFs through. Creates the task's layout set when it is missing, and leaves the pages untouched when
    /// they already hold exactly that copy.
    /// </summary>
    public Task<IEnumerable<SubformComponentDto>> SaveSubformPdfComponent(
        AltinnRepoEditingContext editingContext,
        string layoutSetId,
        string componentId,
        string sourceLayoutSetId,
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
