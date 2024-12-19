using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using NuGet.Versioning;
using LayoutSets = Altinn.Studio.Designer.Models.LayoutSets;

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
        public async Task<IEnumerable<string>> GetAppMetadataModelIds(AltinnRepoEditingContext altinnRepoEditingContext, bool onlyUnReferenced,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            ApplicationMetadata applicationMetadata =
                await altinnAppGitRepository.GetApplicationMetadata(cancellationToken);
            return GetAppMetadataModelIds(applicationMetadata, onlyUnReferenced);
        }

        /// <inheritdoc />
        public async Task<ModelMetadata> GetModelMetadata(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, string dataModelName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string modelPath;
            ModelMetadata modelMetadata;

            if (dataModelName is not null)
            {
                modelPath = $"App/models/{dataModelName}.schema.json";
                modelMetadata = await _schemaModelService.GenerateModelMetadataFromJsonSchema(altinnRepoEditingContext, modelPath, cancellationToken);
                return modelMetadata;
            }

            string modelName = await GetModelName(altinnRepoEditingContext, layoutSetName, cancellationToken);

            if (string.IsNullOrEmpty(modelName))
            {
                return new ModelMetadata();
            }

            modelPath = $"App/models/{modelName}.schema.json";
            modelMetadata = await _schemaModelService.GenerateModelMetadataFromJsonSchema(altinnRepoEditingContext, modelPath, cancellationToken);
            return modelMetadata;
        }

        private async Task<string> GetModelName(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(layoutSetName))
            {
                // Fallback to first model in app metadata if no layout set is provided
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
                ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(cancellationToken);
                return applicationMetadata.DataTypes.FirstOrDefault(data => data.AppLogic != null && !string.IsNullOrEmpty(data.AppLogic.ClassRef) && !string.IsNullOrEmpty(data.TaskId))?.Id ?? string.Empty;
            }

            LayoutSets layoutSets = await GetLayoutSets(altinnRepoEditingContext, cancellationToken);
            var foundLayoutSet = layoutSets.Sets.Find(set => set.Id == layoutSetName);

            return foundLayoutSet.DataType;
        }

        private IEnumerable<string> GetAppMetadataModelIds(ApplicationMetadata applicationMetadata, bool onlyUnReferenced)
        {
            var appMetaDataDataTypes = applicationMetadata.DataTypes
                .Where(data => data.AppLogic != null && !string.IsNullOrEmpty(data.AppLogic.ClassRef));

            if (onlyUnReferenced)
            {
                var unReferencedDataTypes =
                    appMetaDataDataTypes.Where(dataType => string.IsNullOrEmpty(dataType.TaskId));
                return unReferencedDataTypes.Select(datatype => datatype.Id);
            }

            return appMetaDataDataTypes.Select(datatype => datatype.Id);
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

        private static string TaskTypeFromDefinitions(Definitions definitions, string taskId)
        {
            return definitions.Process.Tasks.FirstOrDefault(task => task.Id == taskId)?.ExtensionElements?.TaskExtension?.TaskType ?? string.Empty;
        }

        public async Task<LayoutSetsModel> GetLayoutSetsExtended(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            LayoutSets layoutSetsFile = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
            Definitions definitions = altinnAppGitRepository.GetDefinitions();

            LayoutSetsModel layoutSetsModel = new();
            layoutSetsFile.Sets.ForEach(set =>
            {
                LayoutSetModel layoutSetModel = new()
                {
                    id = set.Id,
                    dataType = set.DataType,
                    type = set.Type,
                };
                string taskId = set.Tasks?[0];
                if (taskId != null)
                {
                    string taskType = TaskTypeFromDefinitions(definitions, taskId);
                    layoutSetModel.task = new TaskModel
                    {
                        id = taskId,
                        type = taskType
                    };
                }
                layoutSetsModel.sets.Add(layoutSetModel);
            });
            return layoutSetsModel;
        }

        /// <inheritdoc />
        public async Task<LayoutSetConfig> GetLayoutSetConfig(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetId,
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
                return layoutSets.Sets.FirstOrDefault(layoutSet => layoutSet.Id == layoutSetId);
            }

            throw new NoLayoutSetsFileFoundException(
                "No layout set found for this app.");
        }

        /// <inheritdoc />
        public async Task<LayoutSets> AddLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext,
            LayoutSetConfig newLayoutSet, bool layoutIsInitialForPaymentTask = false, CancellationToken cancellationToken = default)
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
            if (layoutSets.Sets.Exists(set => set.Id == newLayoutSet.Id))
            {
                throw new NonUniqueLayoutSetIdException($"Layout set name, {newLayoutSet.Id}, already exists.");
            }
            if (newLayoutSet.Tasks != null && layoutSets.Sets.Exists(set => set.Tasks?[0] == newLayoutSet.Tasks[0]))
            {
                throw new NonUniqueTaskForLayoutSetException($"Layout set with task, {newLayoutSet.Tasks[0]}, already exists.");
            }

            return await AddNewLayoutSet(altinnAppGitRepository, layoutSets, newLayoutSet, layoutIsInitialForPaymentTask);
        }

        /// <inheritdoc />
        public async Task<LayoutSets> UpdateLayoutSetName(AltinnRepoEditingContext altinnRepoEditingContext, string oldLayoutSetName,
            string newLayoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            if (!altinnAppGitRepository.AppUsesLayoutSets())
            {

                throw new NoLayoutSetsFileFoundException("No layout set found for this app.");
            }
            if (!Regex.IsMatch(newLayoutSetName, _layoutSetNameRegEx))
            {
                throw new InvalidLayoutSetIdException("New layout set name is not valid.");
            }
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
            // NewLayoutSet Id is not the same as existing layout set Id so must check if the suggested new Id already exists
            if (layoutSets.Sets.Exists(set => set.Id == newLayoutSetName))
            {
                throw new NonUniqueLayoutSetIdException($"Layout set name, {newLayoutSetName}, already exists.");
            }
            // Layout set name is updated which means layout set folder must be updated also
            altinnAppGitRepository.ChangeLayoutSetFolderName(oldLayoutSetName, newLayoutSetName, cancellationToken);
            return await UpdateLayoutSetName(altinnAppGitRepository, layoutSets, oldLayoutSetName, newLayoutSetName);
        }

        public async Task<LayoutSets> DeleteLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext,
            string layoutSetToDeleteId, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository =
                _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                    altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
            var layoutSetToDelete = layoutSets.Sets.Find(set => set.Id == layoutSetToDeleteId);
            var dataTypeNameToRemoveTaskIdRef = layoutSetToDelete?.DataType;
            if (!string.IsNullOrEmpty(dataTypeNameToRemoveTaskIdRef))
            {
                await DeleteTaskRefInApplicationMetadata(altinnAppGitRepository, dataTypeNameToRemoveTaskIdRef);
            }

            altinnAppGitRepository.DeleteLayoutSetFolder(layoutSetToDeleteId, cancellationToken);
            return await DeleteExistingLayoutSet(altinnAppGitRepository, layoutSets, layoutSetToDeleteId);
        }

        private async Task DeleteTaskRefInApplicationMetadata(AltinnAppGitRepository altinnAppGitRepository, string dataTypeId)
        {
            var applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
            var dataType = applicationMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId);
            dataType.TaskId = null;
            await altinnAppGitRepository.SaveApplicationMetadata(applicationMetadata);
        }

        private static async Task<LayoutSets> DeleteExistingLayoutSet(AltinnAppGitRepository altinnAppGitRepository, LayoutSets layoutSets, string layoutSetToDeleteId)
        {
            LayoutSetConfig layoutSetToDelete = layoutSets.Sets.Find(set => set.Id == layoutSetToDeleteId);
            layoutSets.Sets.Remove(layoutSetToDelete);
            await altinnAppGitRepository.SaveLayoutSets(layoutSets);
            return layoutSets;
        }

        private static async Task<LayoutSets> AddNewLayoutSet(AltinnAppGitRepository altinnAppGitRepository, LayoutSets layoutSets, LayoutSetConfig layoutSet, bool layoutIsInitialForPaymentTask = false)
        {
            layoutSets.Sets.Add(layoutSet);
            if (layoutIsInitialForPaymentTask)
            {
                AddPaymentComponentToInitialLayoutForPaymentTask(altinnAppGitRepository.InitialLayout);
            }
            await altinnAppGitRepository.SaveLayout(layoutSet.Id, AltinnAppGitRepository.InitialLayoutFileName,
                altinnAppGitRepository.InitialLayout);
            await altinnAppGitRepository.SaveLayoutSettings(layoutSet.Id,
                altinnAppGitRepository.InitialLayoutSettings);
            await altinnAppGitRepository.SaveLayoutSets(layoutSets);
            return layoutSets;
        }

        private static void AddPaymentComponentToInitialLayoutForPaymentTask(JsonNode layout)
        {
            var layoutArray = layout["data"]["layout"] as JsonArray;
            if (layoutArray != null)
            {
                var defaultComponent = new JsonObject
                {
                    ["id"] = "PaymentComponentId",
                    ["type"] = "Payment",
                    ["renderAsSummary"] = true
                };
                layoutArray.Add(defaultComponent);
            }
        }

        private async Task<LayoutSets> UpdateLayoutSetName(AltinnAppGitRepository altinnAppGitRepository, LayoutSets layoutSets, string oldLayoutSetName, string newLayoutSetName)
        {
            layoutSets.Sets.Find(set => set.Id == oldLayoutSetName).Id = newLayoutSetName;
            await altinnAppGitRepository.SaveLayoutSets(layoutSets);
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

            string[] packageNames = ["Altinn.App.Api", "Altinn.App.Api.Experimental"];

            foreach (string csprojFile in csprojFiles)
            {
                if (PackageVersionHelper.TryGetPackageVersionFromCsprojFile(csprojFile, packageNames,
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

        public async Task AddComponentToLayout(
                AltinnRepoEditingContext editingContext,
                string layoutSetName,
                string layoutName,
                object component,
                CancellationToken cancellationToken = default)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                editingContext.Org,
                editingContext.Repo,
                editingContext.Developer
            );
            JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, $"{layoutName}.json", cancellationToken);
            if (formLayout["data"] is not JsonObject data || data["layout"] is not JsonArray layoutArray)
            {
                throw new InvalidOperationException("Invalid form layout structure");
            }
            layoutArray.Add(component);
            await SaveFormLayout(editingContext, layoutSetName, layoutName, formLayout, cancellationToken);
        }

        public async Task<bool> DeleteReferencesFromLayouts(AltinnRepoEditingContext editingContext, List<Reference> referencesToDelete, CancellationToken cancellationToken)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer);

            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);

            return await DeleteReferencesFromLayouts(altinnAppGitRepository, layoutSets.Sets, referencesToDelete, cancellationToken);
        }

        private async Task<bool> DeleteReferencesFromLayouts(AltinnAppGitRepository altinnAppGitRepository, List<LayoutSetConfig> layoutSets, List<Reference> referencesToDelete, CancellationToken cancellationToken)
        {
            List<Reference> newReferencesToDelete = [];
            bool hasChanges = false;

            var deletedLayoutsSetIds = referencesToDelete.Where(item => item.Type == "layoutSet").Select(item => item.Id).ToList();
            var deletedLayouts = referencesToDelete.Where(item => item.Type == "page").ToList();
            var deletedComponents = referencesToDelete.Where(item => item.Type == "component").ToList();

            foreach (LayoutSetConfig layoutSet in layoutSets ?? [new() { Id = null }])
            {
                bool isLayoutSetDeleted = deletedLayoutsSetIds.Contains(layoutSet.Id);

                Dictionary<string, JsonNode> layouts = await altinnAppGitRepository.GetFormLayouts(layoutSet.Id, cancellationToken);

                var deletedLayoutIds = deletedLayouts.Where(item => item.LayoutSetName == layoutSet.Id).Select(item => item.Id).ToList();
                foreach (KeyValuePair<string, JsonNode> layout in layouts)
                {
                    bool isLayoutDeleted = deletedLayoutIds.Contains(layout.Key);
                    bool hasLayoutChanges = false;

                    // TODO : https://github.com/Altinn/altinn-studio/issues/14073
                    if (layout.Value["data"] is not JsonObject data || data["layout"] is not JsonArray componentList)
                    {
                        return false;
                    }

                    var deletedLayoutComponentIds = deletedComponents.Where(item => item.LayoutSetName == layoutSet.Id).Select(item => item.Id).ToList();
                    for (int i = componentList.Count - 1; i >= 0; i--)
                    {
                        JsonNode componentNode = componentList[i];
                        if (componentNode is not JsonObject component)
                        {
                            continue;
                        }

                        string componentId = component["id"]?.GetValue<string>();
                        bool isComponentDeleted = deletedLayoutComponentIds.Contains(componentId);

                        if (isLayoutSetDeleted || isLayoutDeleted || isComponentDeleted)
                        {
                            if (!isComponentDeleted)
                            {
                                newReferencesToDelete.Add(new Reference("component", layoutSet.Id, componentId));
                            }

                            continue;
                        }

                        string componentType = component["type"]?.GetValue<string>();
                        switch (componentType)
                        {
                            case "Subform":
                                if (deletedLayoutsSetIds.Contains(component["layoutSet"]?.GetValue<string>()))
                                {
                                    newReferencesToDelete.Add(new Reference("component", layoutSet.Id, componentId));
                                    componentList.RemoveAt(i);
                                    hasLayoutChanges = true;
                                }
                                break;
                            case "Summary2":
                                if (component["target"] is JsonObject target)
                                {
                                    string type = target["type"]?.GetValue<string>();
                                    string id = target["id"]?.GetValue<string>();
                                    string taskId = target["taskId"]?.GetValue<string>();
                                    string layouSetId = string.IsNullOrEmpty(taskId) ? layoutSet.Id : layoutSets?.FirstOrDefault(item => item.Tasks?.Contains(taskId) ?? false)?.Id;

                                    if (type switch
                                    {
                                        "layoutSet" => deletedLayoutsSetIds.Contains(layouSetId),
                                        "page" => deletedLayouts.Exists(item => item.LayoutSetName == layouSetId && item.Id == id),
                                        "component" => deletedComponents.Exists(item => item.LayoutSetName == layouSetId && item.Id == id),
                                        _ => false
                                    })
                                    {
                                        newReferencesToDelete.Add(new Reference("component", layoutSet.Id, componentId));
                                        componentList.RemoveAt(i);
                                        hasLayoutChanges = true;
                                    }

                                    if (component["overrides"] is JsonArray overrideList)
                                    {
                                        overrideList.RemoveAll(overrideItem =>
                                        {
                                            string componentId = overrideItem["componentId"]?.GetValue<string>();
                                            if (deletedComponents.Exists(item => item.LayoutSetName == layouSetId && item.Id == componentId))
                                            {
                                                hasLayoutChanges = true;
                                                return true;
                                            }

                                            return false;
                                        });

                                        if (overrideList.Count == 0)
                                        {
                                            component.Remove("overrides");
                                        }
                                    }
                                }
                                break;
                        }
                    }

                    if (isLayoutSetDeleted || isLayoutDeleted)
                    {
                        if (!isLayoutDeleted)
                        {
                            newReferencesToDelete.Add(new Reference("page", layoutSet.Id, layout.Key));
                        }

                        continue;
                    }

                    if (hasLayoutChanges)
                    {
                        await altinnAppGitRepository.SaveLayout(layoutSet.Id, $"{layout.Key}.json", layout.Value, cancellationToken);
                        hasChanges = true;
                    }
                }
            }

            if (newReferencesToDelete.Count > 0)
            {
                hasChanges |= await DeleteReferencesFromLayouts(altinnAppGitRepository, layoutSets, newReferencesToDelete, cancellationToken);
            }

            return hasChanges;
        }
    }
}
