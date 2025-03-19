using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface ITaskNavigationService
    {
        /// <summary>
        /// Get task navigation
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is canceled.</param>
        public Task<List<TaskNavigationModel>> GetTaskNavigation(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default);
    }
}
