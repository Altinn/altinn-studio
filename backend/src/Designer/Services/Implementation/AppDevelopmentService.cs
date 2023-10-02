using System.Collections.Generic;
using System.IO;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Service to handle functionality concerning app-development
    /// </summary>
    public class AppDevelopmentService : IAppDevelopmentService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
        public AppDevelopmentService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <inheritdoc />
        public async Task<Dictionary<string, JsonNode>> GetFormLayouts(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            Dictionary<string, JsonNode> formLayouts = await altinnAppGitRepository.GetFormLayouts(layoutSetName, cancellationToken);
            return formLayouts;
        }

        /// <inheritdoc />
        public async Task SaveFormLayout(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, string layoutName, JsonNode formLayout, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string layoutFileName = $"{layoutName}.json";
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            await altinnAppGitRepository.SaveLayout(layoutSetName, layoutFileName, formLayout, cancellationToken);
        }

        /// <inheritdoc />
        public void DeleteFormLayout(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, string layoutName)
        {
            string layoutFileName = $"{layoutName}.json";
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            altinnAppGitRepository.DeleteLayout(layoutSetName, layoutFileName);
        }

        /// <inheritdoc />
        public void UpdateFormLayoutName(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, string layoutName, string newName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            altinnAppGitRepository.UpdateFormLayoutName(layoutSetName, $"{layoutName}.json", $"{newName}.json");
        }

        /// <inheritdoc />
        public async Task<JsonNode> GetLayoutSettings(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            var layoutSettings = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetName, cancellationToken);
            return layoutSettings;
        }

        /// <inheritdoc />
        public async Task SaveLayoutSettings(AltinnRepoEditingContext altinnRepoEditingContext, JsonNode layoutSettings, string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                await altinnAppGitRepository.SaveLayoutSettings(layoutSetName, layoutSettings);
                return;
            }
            await altinnAppGitRepository.SaveLayoutSettings(null, layoutSettings);
        }

        public async Task<LayoutSets> GetLayoutSets(AltinnRepoEditingContext altinnRepoEditingContext, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                // TODO: introduce better check to evaluate if app uses layout sets
                LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
                return layoutSets;
            }

            return null;
        }

        public async Task<LayoutSets> ConfigureLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                throw new BadHttpRequestException("Layout sets are already configured for this app");
            }

            altinnAppGitRepository.MoveLayoutsToInitialLayoutSet(layoutSetName);
            altinnAppGitRepository.MoveOtherUiFilesToLayoutSet(layoutSetName);
            LayoutSets layoutSets = await altinnAppGitRepository.CreateLayoutSetFile(layoutSetName);
            return layoutSets;
        }

        public async Task AddLayoutSet(AltinnRepoEditingContext altinnRepoEditingContext, LayoutSetConfig layoutSet, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
                layoutSets.Sets.Add(layoutSet);
                await altinnAppGitRepository.SaveLayoutSetsFile(layoutSets);
                return;
            }

            throw new FileNotFoundException("No layout set found for this app");
        }

        /// <inheritdoc />
        public async Task<string> GetRuleHandler(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            string ruleHandler = await altinnAppGitRepository.GetRuleHandler(layoutSetName, cancellationToken);
            return ruleHandler;
        }

        /// <inheritdoc />
        public async Task SaveRuleHandler(AltinnRepoEditingContext altinnRepoEditingContext, string ruleHandler, string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }
            await altinnAppGitRepository.SaveRuleHandler(layoutSetName, ruleHandler);
        }

        /// <inheritdoc />
        public async Task<string> GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(AltinnRepoEditingContext altinnRepoEditingContext, string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            string ruleConfig = await altinnAppGitRepository.GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(layoutSetName, cancellationToken);
            return ruleConfig;
        }

        /// <inheritdoc />
        public async Task SaveRuleConfig(AltinnRepoEditingContext altinnRepoEditingContext, JsonNode ruleConfig, string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }
            await altinnAppGitRepository.SaveRuleConfiguration(layoutSetName, ruleConfig, cancellationToken);
        }

        /// <inheritdoc />
        public Task<string> GetProcessDefinition(AltinnRepoEditingContext altinnAppContext, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnAppContext.Org, altinnAppContext.Repo, altinnAppContext.Developer);
            return altinnAppGitRepository.GetProcessDefinitionFile(cancellationToken);

        }

        /// <inheritdoc />
        public Task<string> SaveProcessDefinition(AltinnRepoEditingContext altinnAppContext, string bpmnXml, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnAppContext.Org, altinnAppContext.Repo, altinnAppContext.Developer);
            return altinnAppGitRepository.SaveProcessDefinitionFile(bpmnXml, cancellationToken);
        }
    }
}
