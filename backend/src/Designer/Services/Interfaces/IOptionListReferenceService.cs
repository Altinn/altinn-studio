using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Service for handling option list references within layouts.
/// </summary>
public interface IOptionListReferenceService
{
    /// <summary>
    /// Gets all option list references with task data included.
    /// </summary>
    /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>A list of <see cref="RefToOptionListSpecifier"/> with task data.</returns>
    Task<List<RefToOptionListSpecifier>> GetAllOptionListReferences(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds all option list references in all layout sets.
    /// </summary>
    /// <param name="org">Organization name.</param>
    /// <param name="repo">Repository name.</param>
    /// <param name="developer">Developer name.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>A list of <see cref="RefToOptionListSpecifier"/>.</returns>
    Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInLayoutSetsAsync(string org, string repo, string developer, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds all option list references in given layout sets.
    /// </summary>
    /// <param name="org">Organization name.</param>
    /// <param name="repo">Repository name.</param>
    /// <param name="developer">Developer name.</param>
    /// <param name="layoutSetNames">The layout set names to search.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>A list of <see cref="RefToOptionListSpecifier"/>.</returns>
    Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInGivenLayoutSetsAsync(string org, string repo, string developer, string[] layoutSetNames, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds all option list references in a specific layout set.
    /// </summary>
    /// <param name="org">Organization name.</param>
    /// <param name="repo">Repository name.</param>
    /// <param name="developer">Developer name.</param>
    /// <param name="layoutSetName">The name of the layout set to search.</param>
    /// <param name="existingReferences">Existing references to append to.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>A list of <see cref="RefToOptionListSpecifier"/>.</returns>
    Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInLayoutSetAsync(string org, string repo, string developer, string layoutSetName, List<RefToOptionListSpecifier> existingReferences, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds all option list references in given layouts.
    /// </summary>
    /// <param name="org">Organization name.</param>
    /// <param name="repo">Repository name.</param>
    /// <param name="developer">Developer name.</param>
    /// <param name="layoutSetName">The layout set name the layouts belong to.</param>
    /// <param name="layoutNames">The layout names to search.</param>
    /// <param name="existingReferences">Existing references to append to.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>A list of <see cref="RefToOptionListSpecifier"/>.</returns>
    Task<List<RefToOptionListSpecifier>> FindOptionListReferencesInGivenLayoutsAsync(string org, string repo, string developer, string layoutSetName, string[] layoutNames, List<RefToOptionListSpecifier> existingReferences, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds all option list references in a specific layout.
    /// </summary>
    /// <param name="altinnAppGitRepository">The git repository instance.</param>
    /// <param name="layout">The layout to search.</param>
    /// <param name="existingReferences">Existing references to append to.</param>
    /// <param name="layoutSetName">The layout set name the layout belongs to.</param>
    /// <param name="layoutName">The name of the layout.</param>
    /// <returns>A list of <see cref="RefToOptionListSpecifier"/>.</returns>
    List<RefToOptionListSpecifier> FindOptionListReferencesInLayout(AltinnAppGitRepository altinnAppGitRepository, JsonNode layout, List<RefToOptionListSpecifier> existingReferences, string layoutSetName, string layoutName);
}