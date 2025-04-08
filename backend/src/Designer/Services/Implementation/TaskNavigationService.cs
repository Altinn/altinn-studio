using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Service to handle functionality concerning task navigation
    /// </summary>
    public class TaskNavigationService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory) : ITaskNavigationService
    {
        public async Task<IEnumerable<TaskNavigationGroup>> GetTaskNavigation(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();

            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            LayoutSets layoutSetsFile = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);

            return layoutSetsFile.UiSettings?.TaskNavigation ?? [];
        }

        public IEnumerable<ProcessTask> GetTasks(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            Definitions definitions = altinnAppGitRepository.GetDefinitions();
            return definitions.Process.Tasks;
        }

        public async Task AddTaskNavigationGroup(AltinnRepoEditingContext altinnRepoEditingContext, TaskNavigationGroup taskNavigationGroup, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);

            layoutSets.UiSettings ??= new();
            layoutSets.UiSettings.TaskNavigation ??= [];
            layoutSets.UiSettings.TaskNavigation.Add(taskNavigationGroup);

            await altinnAppGitRepository.SaveLayoutSets(layoutSets);
        }
    }
}
