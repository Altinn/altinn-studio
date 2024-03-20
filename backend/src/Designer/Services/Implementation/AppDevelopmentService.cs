using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Exceptions;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using JetBrains.Annotations;
using Microsoft.AspNetCore.Http;
using NuGet.Versioning;
using LayoutSets = Altinn.Studio.Designer.Models.LayoutSets;
using NonUniqueLayoutSetIdException = Altinn.Studio.Designer.Exceptions.NonUniqueLayoutSetIdException;
using PlatformStorageModels = Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Service to handle functionality concerning app-development
    /// </summary>
    public class AppDevelopmentService : IAppDevelopmentService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly ISchemaModelService _schemaModelService;
        private readonly string _layoutSetNameRegEx = "[a-zA-Z0-9-]{2,28}";

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
        /// <param name="schemaModelService">ISchemaModelService</param>
        public AppDevelopmentService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, ISchemaModelService schemaModelService)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _schemaModelService = schemaModelService;
        }

        /// <inheritdoc />
        public async Task<Dictionary<string, JsonNode>> GetFormLayouts(
            AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException(
                    "This app uses layout sets, but no layout set name was provided for this request");
            }

            Dictionary<string, JsonNode> formLayouts =
                await altinnAppGitRepository.GetFormLayouts(layoutSetName, cancellationToken);
            return formLayouts;
        }

        /// <inheritdoc />
        public async Task SaveFormLayout(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName,
            string layoutName, JsonNode formLayout, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string layoutFileName = $"{layoutName}.json";
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException(
                    "This app uses layout sets, but no layout set name was provided for this request");
            }

            await altinnAppGitRepository.SaveLayout(layoutSetName, layoutFileName, formLayout, cancellationToken);
        }

        /// <inheritdoc />
        public void DeleteFormLayout(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName,
            string layoutName)
        {
            string layoutFileName = $"{layoutName}.json";
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException(
                    "This app uses layout sets, but no layout set name was provided for this request");
            }

            altinnAppGitRepository.DeleteLayout(layoutSetName, layoutFileName);
        }

        /// <inheritdoc />
        public void UpdateFormLayoutName(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName,
            string layoutName, string newName)
        {
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException(
                    "This app uses layout sets, but no layout set name was provided for this request");
            }

            altinnAppGitRepository.UpdateFormLayoutName(layoutSetName, $"{layoutName}.json", $"{newName}.json");
        }

        /// <inheritdoc />
        public async Task<JsonNode> GetLayoutSettings(AltinnRepoEditingContext altinnRepoEditingContext,
            string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException(
                    "This app uses layout sets, but no layout set name was provided for this request");
            }

            var layoutSettings =
                await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetName, cancellationToken);
            return layoutSettings;
        }

        /// <inheritdoc />
        public async Task SaveLayoutSettings(AltinnRepoEditingContext altinnRepoEditingContext, JsonNode layoutSettings,
            string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                await altinnAppGitRepository.SaveLayoutSettings(layoutSetName, layoutSettings);
                return;
            }

            await altinnAppGitRepository.SaveLayoutSettings(null, layoutSettings);
        }

        /// <inheritdoc />
        public async Task<string[]> GetLayoutNames(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                string[] layoutNames = [];
                LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
                foreach (LayoutSetConfig layoutSetConfig in layoutSets.Sets)
                {
                    string[] layoutNamesForSet = altinnAppGitRepository.GetLayoutNames(layoutSetConfig.Id);
                    layoutNames = layoutNames.Concat(layoutNamesForSet).ToArray();
                }
                return layoutNames;
            }

            return altinnAppGitRepository.GetLayoutNames(null);
        }

        /// <inheritdoc />
        public async Task<ModelMetadata> GetModelMetadata(AltinnRepoEditingContext altinnRepoEditingContext,
            string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            ApplicationMetadata applicationMetadata =
                await altinnAppGitRepository.GetApplicationMetadata(cancellationToken);
            // get task_id since we might not maintain dataType ref in layout-sets-file
            string taskId = await GetTaskIdBasedOnLayoutSet(altinnRepoEditingContext, layoutSetName, cancellationToken);
            string modelName = GetModelName(applicationMetadata, taskId);
            if (string.IsNullOrEmpty(modelName))
            {
                return new ModelMetadata();
            }
            string modelPath = $"App/models/{modelName}.schema.json";
            ModelMetadata modelMetadata = await _schemaModelService.GenerateModelMetadataFromJsonSchema(altinnRepoEditingContext, modelPath, cancellationToken);
            return modelMetadata;
        }

        private string GetModelName(ApplicationMetadata applicationMetadata, [CanBeNull] string taskId)
        {
            // fallback to first model if no task_id is provided (no layoutsets)
            if (taskId == null)
            {
                return applicationMetadata.DataTypes.FirstOrDefault(data => data.AppLogic != null && !string.IsNullOrEmpty(data.AppLogic.ClassRef) && !string.IsNullOrEmpty(data.TaskId))?.Id ?? string.Empty;
            }

            PlatformStorageModels.DataType data = applicationMetadata.DataTypes
                .FirstOrDefault(data => data.AppLogic != null && DoesDataTaskMatchTaskId(data, taskId) && !string.IsNullOrEmpty(data.AppLogic.ClassRef));

            return data?.Id ?? string.Empty;
        }

        private bool DoesDataTaskMatchTaskId(PlatformStorageModels.DataType data, [CanBeNull] string taskId)
        {
            return string.IsNullOrEmpty(taskId) || data.TaskId == taskId;
        }

        private async Task<string> GetTaskIdBasedOnLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default)
        {
            LayoutSets layoutSets = await GetLayoutSets(altinnRepoEditingContext, cancellationToken);
            return layoutSets?.Sets?.Find(set => set.Id == layoutSetName)?.Tasks[0];
        }

        /// <inheritdoc />
        public async Task<LayoutSets> GetLayoutSets(AltinnRepoEditingContext altinnRepoEditingContext,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                // TODO: introduce better check to evaluate if app uses layout sets
                LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
                return layoutSets;
            }

            throw new NoLayoutSetsFileFoundException(
                "No layout set found for this app.");
        }

        /// <inheritdoc />
        public async Task<LayoutSets> AddLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext,
            LayoutSetConfig newLayoutSet, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            if (!altinnAppGitRepository.AppUsesLayoutSets())
            {
                throw new NoLayoutSetsFileFoundException("No layout set found for this app.");
            }
            if (Regex.IsMatch(newLayoutSet.Id, _layoutSetNameRegEx))
            {
                throw new InvalidLayoutSetIdException("New layout set name is not valid.");
            }
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
            if (layoutSets.Sets.Exists(set => set.Id == newLayoutSet.Id))
            {
                throw new NonUniqueLayoutSetIdException($"Layout set name, {newLayoutSet.Id}, already exists.");
            }

            return await AddNewLayoutSet(altinnAppGitRepository, layoutSets, newLayoutSet);
        }

        /// <inheritdoc />
        public async Task<LayoutSets> UpdateLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetToUpdateId,
            LayoutSetConfig newLayoutSet, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            if (!altinnAppGitRepository.AppUsesLayoutSets())
            {

                throw new NoLayoutSetsFileFoundException("No layout set found for this app.");
            }
            if (!Regex.IsMatch(newLayoutSet.Id, _layoutSetNameRegEx))
            {
                throw new InvalidLayoutSetIdException("New layout set name is not valid.");
            }
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
            LayoutSetConfig layoutSetToReplace = layoutSets.Sets.Find(set => set.Id == layoutSetToUpdateId);
            if (newLayoutSet.Id == layoutSetToUpdateId)
            {
                return await UpdateExistingLayoutSet(altinnAppGitRepository, layoutSets, layoutSetToReplace, newLayoutSet);
            }
            // NewLayoutSet Id is not the same as existing layout set Id so must check if the suggested new Id already exists
            if (layoutSets.Sets.Exists(set => set.Id == newLayoutSet.Id))
            {
                throw new NonUniqueLayoutSetIdException($"Layout set name, {newLayoutSet.Id}, already exists.");
            }
            // Layout set name is updated which means layout set folder must be updated also
            altinnAppGitRepository.ChangeLayoutSetFolderName(layoutSetToUpdateId, newLayoutSet.Id, cancellationToken);
            return await UpdateExistingLayoutSet(altinnAppGitRepository, layoutSets, layoutSetToReplace, newLayoutSet);
        }

        private static async Task<LayoutSets> AddNewLayoutSet(AltinnAppGitRepository altinnAppGitRepository, LayoutSets layoutSets, LayoutSetConfig layoutSet)
        {
            layoutSets.Sets.Add(layoutSet);
            await altinnAppGitRepository.SaveLayout(layoutSet.Id, AltinnAppGitRepository.InitialLayoutFileName,
                altinnAppGitRepository.InitialLayout);
            await altinnAppGitRepository.SaveLayoutSettings(layoutSet.Id,
                altinnAppGitRepository.InitialLayoutSettings);
            await altinnAppGitRepository.SaveLayoutSetsFile(layoutSets);
            return layoutSets;
        }

        private static async Task<LayoutSets> UpdateExistingLayoutSet(AltinnAppGitRepository altinnAppGitRepository, LayoutSets layoutSets, LayoutSetConfig layoutSetToReplace, LayoutSetConfig newLayoutSet)
        {
            int indexOfLayoutSetToReplace = layoutSets.Sets.IndexOf(layoutSetToReplace);
            layoutSets.Sets[indexOfLayoutSetToReplace] = newLayoutSet;
            await altinnAppGitRepository.SaveLayoutSetsFile(layoutSets);
            return layoutSets;
        }


        /// <inheritdoc />
        public async Task<string> GetRuleHandler(AltinnRepoEditingContext altinnRepoEditingContext,
            string layoutSetName, CancellationToken cancellationToken = default)
        {
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException(
                    "This app uses layout sets, but no layout set name was provided for this request");
            }

            string ruleHandler = await altinnAppGitRepository.GetRuleHandler(layoutSetName, cancellationToken);
            return ruleHandler;
        }

        /// <inheritdoc />
        public async Task SaveRuleHandler(AltinnRepoEditingContext altinnRepoEditingContext, string ruleHandler,
            string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException(
                    "This app uses layout sets, but no layout set name was provided for this request");
            }

            await altinnAppGitRepository.SaveRuleHandler(layoutSetName, ruleHandler);
        }

        /// <inheritdoc />
        public async Task<string> GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(
            AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException(
                    "This app uses layout sets, but no layout set name was provided for this request");
            }

            string ruleConfig =
                await altinnAppGitRepository.GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(layoutSetName,
                    cancellationToken);
            return ruleConfig;
        }

        /// <inheritdoc />
        public async Task SaveRuleConfig(AltinnRepoEditingContext altinnRepoEditingContext, JsonNode ruleConfig,
            string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException(
                    "This app uses layout sets, but no layout set name was provided for this request");
            }

            await altinnAppGitRepository.SaveRuleConfiguration(layoutSetName, ruleConfig, cancellationToken);
        }

        /// <inheritdoc />
        public SemanticVersion GetAppLibVersion(AltinnRepoEditingContext altinnRepoEditingContext)
        {
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            var csprojFiles = altinnAppGitRepository.FindFiles(new[] { "*.csproj" });

            foreach (string csprojFile in csprojFiles)
            {
                if (PackageVersionHelper.TryGetPackageVersionFromCsprojFile(csprojFile, "Altinn.App.Api",
                        out SemanticVersion version))
                {
                    return version;
                }
            }

            throw new FileNotFoundException("Unable to extract the version of the app-lib from csproj files.");
        }

        public bool TryGetFrontendVersion(AltinnRepoEditingContext altinnRepoEditingContext, out string version)
        {
            version = null;
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            string indexFilePath;

            try
            {
                indexFilePath = altinnAppGitRepository.FindFiles(new[] { "App/views/Home/Index.cshtml" }).FirstOrDefault();
            }
            catch (DirectoryNotFoundException)
            {
                return false;
            }


            return indexFilePath is not null && AppFrontendVersionHelper.TryGetFrontendVersionFromIndexFile(indexFilePath, out version);
        }
    }
}
