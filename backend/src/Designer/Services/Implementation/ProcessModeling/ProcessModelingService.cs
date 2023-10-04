using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation.ProcessModeling
{
    public class ProcessModelingService : IProcessModelingService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        public ProcessModelingService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        public Task<IEnumerable<AltinnCoreFile>> GetProcessDefinitionTemplateNames(SemanticVersion version, CancellationToken cancellationToken = default) => throw new System.NotImplementedException();
        public Task SaveProcessDefinitionFromTemplate(string templateName, SemanticVersion version, CancellationToken cancellationToken = default) => throw new System.NotImplementedException();

        /// <inheritdoc/>
        public async Task SaveProcessDefinition(AltinnRepoEditingContext altinnRepoEditingContext, Stream bpmnStream, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            await altinnAppGitRepository.SaveProcessDefinitionFile(bpmnStream, cancellationToken);
        }
        /// <inheritdoc/>
        public Task<Stream> GetProcessDefinition(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            return altinnAppGitRepository.GetProcessDefinitionFile(cancellationToken);
        }
    }
}
