using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IProcessModelingService
    {
        /// <summary>
        /// Gets defined process definition templates for a given version.
        /// </summary>
        /// <param name="version">Version of the app-lib</param>
        /// <returns>An IEnumerable containing supported templates for given version.</returns>
        IEnumerable<string> GetProcessDefinitionTemplates(SemanticVersion version);

        /// <summary>
        /// Saves the process definition file for a given app from a template.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="templateName">Name of the template.</param>
        /// <param name="version">Version of the app-lib.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task SaveProcessDefinitionFromTemplateAsync(AltinnRepoEditingContext altinnRepoEditingContext, string templateName, SemanticVersion version, CancellationToken cancellationToken = default);

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
        /// Updates the name of a task in the process definition file.
        /// </summary>
        /// <param name="altinnRepoEditingContext">n <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="taskId">The ID of the task to update</param>
        /// <param name="taskName">The name to set for the task</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns></returns>
        Task<Stream> UpdateProcessTaskNameAsync(AltinnRepoEditingContext altinnRepoEditingContext, string taskId, string taskName, CancellationToken cancellationToken = default);
    }
}
