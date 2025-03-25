using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using LayoutSets = Altinn.Studio.Designer.Models.LayoutSets;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Service to handle functionality concerning task navigation
    /// </summary>
    public class TaskNavigationService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory) : ITaskNavigationService
    {
        private static string TaskTypeFromDefinitions(Definitions definitions, string taskId)
        {
            return definitions.Process.Tasks.FirstOrDefault(task => task.Id == taskId)?.ExtensionElements?.TaskExtension?.TaskType;
        }

        public async Task<List<TaskNavigationGroupDto>> GetTaskNavigation(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            LayoutSets layoutSetsFile = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
            Definitions definitions = altinnAppGitRepository.GetDefinitions();

            var taskNavigationGroupList = new List<TaskNavigationGroupDto>();
            layoutSetsFile.UiSettings?.TaskNavigation?.ForEach(taskNavigationGroup =>
            {
                taskNavigationGroupList.Add(new()
                {
                    TaskId = taskNavigationGroup.TaskId,
                    TaskType = taskNavigationGroup.Type ?? TaskTypeFromDefinitions(definitions, taskNavigationGroup.TaskId),
                    Name = taskNavigationGroup.Name,
                });
            });

            return taskNavigationGroupList;
        }
    }
}
