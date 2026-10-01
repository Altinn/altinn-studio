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

    /// <summary>
    /// Creates a layout set folder with its initial layout and settings, and publishes
    /// <see cref="Events.LayoutSetCreatedEvent"/>.
    /// </summary>
    /// <param name="editingContext">The repository to add the layout set to.</param>
    /// <param name="newLayoutSet">The layout set to add.</param>
    /// <param name="taskType">The type of the task the layout set belongs to, which decides its initial content.</param>
    /// <param name="cancellationToken">Observes whether the operation is cancelled.</param>
    /// <param name="publisherNotifies">
    /// Whether the caller sends the sync notification once its whole edit has succeeded, see
    /// <see cref="Events.LayoutSetCreatedEvent.PublisherNotifies"/>.
    /// </param>
    public Task<IEnumerable<UiFolderLayoutSetDto>> AddLayoutSet(
        AltinnRepoEditingContext editingContext,
        LayoutSetConfig newLayoutSet,
        TaskType? taskType,
        CancellationToken cancellationToken,
        bool publisherNotifies = false
    );

    /// <summary>
    /// Validates that a new layout set can be given this name: the name follows the naming policy for new layout
    /// sets, and no layout set folder has it yet.
    /// </summary>
    public Task ValidateNewLayoutSetName(
        AltinnRepoEditingContext editingContext,
        string layoutSetName,
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

    /// <summary>
    /// Deletes a layout set folder, disconnects its default data type from the task, and publishes
    /// <see cref="Events.LayoutSetDeletedEvent"/>.
    /// </summary>
    /// <param name="editingContext">The repository to delete the layout set from.</param>
    /// <param name="layoutSetToDeleteId">The name of the layout set to delete.</param>
    /// <param name="cancellationToken">Observes whether the operation is cancelled.</param>
    /// <param name="publisherNotifies">
    /// Whether the caller sends the sync notification once its whole edit has succeeded, see
    /// <see cref="Events.LayoutSetDeletedEvent.PublisherNotifies"/>.
    /// </param>
    public Task<IEnumerable<UiFolderLayoutSetDto>> DeleteLayoutSet(
        AltinnRepoEditingContext editingContext,
        string layoutSetToDeleteId,
        CancellationToken cancellationToken,
        bool publisherNotifies = false
    );

    public Task<IEnumerable<UiFolderLayoutSetDto>> GetLayoutSetsExtended(
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Lists Subform components outside subform layout sets.
    /// Includes the layout set and default data type of each referenced subform.
    /// </summary>
    public Task<IEnumerable<SubformComponentDto>> GetSubformComponents(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Saves a hidden Subform component copy in the PDF task layout set. Creates the layout set if missing.
    /// Removes the previous generated copy when the selection changes.
    /// Preserves customized components and unrelated content.
    /// </summary>
    public Task<IEnumerable<SubformComponentDto>> SaveSubformPdfComponent(
        AltinnRepoEditingContext editingContext,
        string layoutSetId,
        string componentId,
        string sourceLayoutSetId,
        string? previousComponentId,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<SubformComponentDto>> DeleteSubformPdfComponent(
        AltinnRepoEditingContext editingContext,
        string layoutSetId,
        string componentId,
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
