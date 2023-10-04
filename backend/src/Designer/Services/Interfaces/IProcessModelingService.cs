using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IProcessModelingService
    {
        IEnumerable<string> GetProcessDefinitionTemplates(Version version);
        Task SaveProcessDefinitionFromTemplateAsync(AltinnRepoEditingContext altinnRepoEditingContext, string templateName, Version version, CancellationToken cancellationToken = default);

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
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A <see cref="Stream"/> of a process definition file.</returns>
        Stream GetProcessDefinitionStream(AltinnRepoEditingContext altinnRepoEditingContext);
    }
}
