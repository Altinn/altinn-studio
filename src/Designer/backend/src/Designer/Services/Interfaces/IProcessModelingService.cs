using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IProcessModelingService
    {
        /// <summary>
        /// Saves the process definition file for a given app.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="bpmnStream">A <see cref="Stream"/> that should be saved to process definition file.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task SaveProcessDefinitionAsync(AltinnRepoEditingContext altinnRepoEditingContext, Stream bpmnStream, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets the process definition file stream for a given app.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <returns>A <see cref="Stream"/> of a process definition file.</returns>
        Stream GetProcessDefinitionStream(AltinnRepoEditingContext altinnRepoEditingContext);

        /// <summary>
        /// Adds a simple dataType to applicationMetadata.
        /// Used for adding a dataType when signing and payment tasks are added to the process.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="dataTypeId">Id for the added data type</param>
        /// <param name="taskId">Id for the task that the data type is connected to</param>
        /// /// <param name="allowedContributers">Allowed allowed contributeres</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task AddDataTypeToApplicationMetadataAsync(AltinnRepoEditingContext altinnRepoEditingContext,
            string dataTypeId, string taskId, List<string> allowedContributers, CancellationToken cancellationToken = default);

        /// <summary>
        /// Deletes a simple dataType from applicationMetadata.
        /// Used for deleting a dataType when signing and payment tasks are removed from the process.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="dataTypeId">Id for the data type to remove</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task DeleteDataTypeFromApplicationMetadataAsync(AltinnRepoEditingContext altinnRepoEditingContext,
            string dataTypeId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets the task type from a process definition.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="layoutSetId">The id of the layoutSet to check</param>
        /// <returns>The task type</returns>
        public Task<string> GetTaskTypeFromProcessDefinition(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetId);
    }
}
