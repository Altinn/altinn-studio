using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Implementation.ProcessModeling
{
    public class ProcessModelingService : IProcessModelingService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly IAppDevelopmentService _appDevelopmentService;

        public ProcessModelingService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
            IAppDevelopmentService appDevelopmentService)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _appDevelopmentService = appDevelopmentService;
        }

        private string TemplatesFolderIdentifier(SemanticVersion version) => string.Join(".", nameof(Services),
            nameof(Implementation), nameof(ProcessModeling), "Templates", $"v{version.Major}");

        /// <inheritdoc/>
        public async Task SaveProcessDefinitionAsync(AltinnRepoEditingContext altinnRepoEditingContext,
            Stream bpmnStream, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            await altinnAppGitRepository.SaveProcessDefinitionFileAsync(bpmnStream, cancellationToken);
        }

        /// <inheritdoc/>
        public Stream GetProcessDefinitionStream(AltinnRepoEditingContext altinnRepoEditingContext)
        {
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            return altinnAppGitRepository.GetProcessDefinitionFile();
        }

        public async Task AddDataTypeToApplicationMetadataAsync(AltinnRepoEditingContext altinnRepoEditingContext,
            string dataTypeId, string taskId, List<string>? allowedContributers,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            ApplicationMetadata applicationMetadata =
                await altinnAppGitRepository.GetApplicationMetadata(cancellationToken);
            if (!applicationMetadata.DataTypes.Exists(dataType => dataType.Id == dataTypeId))
            {
                var dataTypeToAdd = new DataType
                {
                    Id = dataTypeId,
                    AllowedContentTypes = new List<string> { "application/json" },
                    MaxCount = 1,
                    TaskId = taskId,
                    EnablePdfCreation = false,
                };

                if (allowedContributers?.Count > 0)
                {
                    dataTypeToAdd.AllowedContributers = allowedContributers;
                }

                applicationMetadata.DataTypes.Add(dataTypeToAdd);
            }

            await altinnAppGitRepository.SaveApplicationMetadata(applicationMetadata);
        }

        public async Task DeleteDataTypeFromApplicationMetadataAsync(AltinnRepoEditingContext altinnRepoEditingContext,
            string dataTypeId, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            ApplicationMetadata applicationMetadata =
                await altinnAppGitRepository.GetApplicationMetadata(cancellationToken);
            applicationMetadata.DataTypes.RemoveAll(dataType => dataType.Id == dataTypeId);
            await altinnAppGitRepository.SaveApplicationMetadata(applicationMetadata);
        }

        public async Task<string> GetTaskTypeFromProcessDefinition(AltinnRepoEditingContext altinnRepoEditingContext,
            string layoutSetId)
        {
            using (Stream processDefinitionStream = GetProcessDefinitionStream(altinnRepoEditingContext))
            {
                XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
                Definitions? definitions = (Definitions?)serializer.Deserialize(processDefinitionStream);
                LayoutSetConfig layoutSet =
                    await _appDevelopmentService.GetLayoutSetConfig(altinnRepoEditingContext, layoutSetId);
                string? taskId = layoutSet.Tasks?.First();
                ProcessTask? task = definitions?.Process.Tasks.FirstOrDefault(task => task.Id == taskId);
                return task?.ExtensionElements?.TaskExtension?.TaskType ?? string.Empty;
            }
        }

        private IEnumerable<string> EnumerateTemplateResources(SemanticVersion version)
        {
            return typeof(ProcessModelingService).Assembly.GetManifestResourceNames()
                .Where(resourceName => resourceName.Contains(TemplatesFolderIdentifier(version)));
        }

        private Stream GetTemplateStream(SemanticVersion version, string templateName)
        {
            var templates = EnumerateTemplateResources(version).ToList();
            if (!templates.Exists(template => template.EndsWith(templateName)))
            {
                throw new FileNotFoundException("Unknown template.");
            }

            string template = templates.Single(template => template.EndsWith(templateName));
            Stream? templateStream = typeof(ProcessModelingService).Assembly.GetManifestResourceStream(template);
            if (templateStream == null)
            {
                throw new FileNotFoundException($"Template resource '{template}' not found in the assembly.");
            }

            return templateStream;
        }
    }
}
