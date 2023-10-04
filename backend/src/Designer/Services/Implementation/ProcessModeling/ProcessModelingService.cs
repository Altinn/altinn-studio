using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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

        private string TemplatesLocation(Version version) => Path.Combine(Path.GetDirectoryName(typeof(ProcessModelingService).Assembly.Location)!, nameof(Services), nameof(Implementation), nameof(ProcessModeling), "Templates", $"v{version.Major}");

        /// <inheritdoc/>
        public IEnumerable<string> GetProcessDefinitionTemplates(Version version)
        {
            return EnumerateTemplatesAsFilePaths(version).Select(Path.GetFileName)!;
        }

        /// <inheritdoc/>
        public async Task SaveProcessDefinitionFromTemplateAsync(AltinnRepoEditingContext altinnRepoEditingContext, string templateName, Version version, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            await using Stream templateStream = GetTemplateStream(version, templateName);
            await altinnAppGitRepository.SaveProcessDefinitionFileAsync(templateStream, cancellationToken);
        }

        /// <inheritdoc/>
        public async Task SaveProcessDefinitionAsync(AltinnRepoEditingContext altinnRepoEditingContext, Stream bpmnStream, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            await altinnAppGitRepository.SaveProcessDefinitionFileAsync(bpmnStream, cancellationToken);
        }

        /// <inheritdoc/>
        public Stream GetProcessDefinitionStream(AltinnRepoEditingContext altinnRepoEditingContext)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            return altinnAppGitRepository.GetProcessDefinitionFile();
        }

        private IEnumerable<string> EnumerateTemplatesAsFilePaths(Version version)
        {
            if (!Directory.Exists(TemplatesLocation(version)))
            {
                return Array.Empty<string>();
            }

            return Directory.EnumerateFiles(TemplatesLocation(version))!;
        }

        private Stream GetTemplateStream(Version version, string templateName)
        {
            var templates = EnumerateTemplatesAsFilePaths(version);
            string templatePath = templates.Single(template => template.EndsWith(templateName));
            return File.OpenRead(templatePath);
        }
    }
}
