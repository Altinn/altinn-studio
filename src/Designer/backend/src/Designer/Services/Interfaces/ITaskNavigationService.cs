#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface ITaskNavigationService
    {
        /// <summary>
        /// Get task navigation
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is canceled.</param>
        /// <returns>The list of task navigation groups.</returns>
        public Task<IEnumerable<TaskNavigationGroup>> GetTaskNavigation(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets the tasks process definitions.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The tasks</returns>
        public IEnumerable<ProcessTask> GetTasks(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken);

        /// <summary>
        /// Update task navigation
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="taskNavigationGroupList">The list of task navigation groups.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is canceled.</param>
        public Task UpdateTaskNavigation(AltinnRepoEditingContext altinnRepoEditingContext, IEnumerable<TaskNavigationGroup> taskNavigationGroupList, CancellationToken cancellationToken);
    }
}
