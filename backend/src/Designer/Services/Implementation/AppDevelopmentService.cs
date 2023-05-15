using System.Collections.Generic;
using System.IO;
using System.Text.Json.Nodes;
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
        public async Task<Dictionary<string, JsonNode>> GetFormLayouts(string org, string app, string developer, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            Dictionary<string, JsonNode> formLayouts = await altinnAppGitRepository.GetFormLayouts(layoutSetName);
            return formLayouts;
        }

        /// <inheritdoc />
        public async Task SaveFormLayout(string org, string app, string developer, string layoutSetName, string layoutName, JsonNode formLayout)
        {
            string layoutFileName = $"{layoutName}.json";
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            await altinnAppGitRepository.SaveLayout(layoutSetName, layoutFileName, formLayout);
        }

        /// <inheritdoc />
        public void DeleteFormLayout(string org, string app, string developer, string layoutSetName, string layoutName)
        {
            string layoutFileName = $"{layoutName}.json";
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            altinnAppGitRepository.DeleteLayout(layoutSetName, layoutFileName);
        }

        /// <inheritdoc />
        public void UpdateFormLayoutName(string org, string app, string developer, string layoutSetName, string layoutName, string newName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            altinnAppGitRepository.UpdateFormLayoutName(layoutSetName, $"{layoutName}.json", $"{newName}.json");
        }

        /// <inheritdoc />
        public async Task<JsonNode> GetLayoutSettings(string org, string app, string developer, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            var layoutSettings = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetName);
            return layoutSettings;
        }

        /// <inheritdoc />
        public async Task SaveLayoutSettings(string org, string app, string developer, JsonNode layoutSettings, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                await altinnAppGitRepository.SaveLayoutSettings(layoutSetName, layoutSettings);
                return;
            }
            await altinnAppGitRepository.SaveLayoutSettings(null, layoutSettings);
        }

        public async Task<LayoutSets> GetLayoutSets(string org, string app, string developer)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                // TODO: introduce better check to evaluate if app uses layout sets
                LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile();
                return layoutSets;
            }

            return null;
        }

        public async Task<LayoutSets> ConfigureLayoutSet(string org, string app, string developer, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
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

        public async Task AddLayoutSet(string org, string app, string developer, LayoutSetConfig layoutSet)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile();
                layoutSets.Sets.Add(layoutSet);
                await altinnAppGitRepository.SaveLayoutSetsFile(layoutSets);
            }

            throw new FileNotFoundException("No layout set found for this app");
        }

        /// <inheritdoc />
        public async Task<string> GetRuleHandler(string org, string app, string developer, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            string ruleHandler = await altinnAppGitRepository.GetRuleHandler(layoutSetName);
            return ruleHandler;
        }

        /// <inheritdoc />
        public async Task SaveRuleHandler(string org, string app, string developer, string ruleHandler, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }
            await altinnAppGitRepository.SaveRuleHandler(layoutSetName, ruleHandler);
        }

        /// <inheritdoc />
        public async Task<string> GetRuleConfig(string org, string app, string developer, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }

            string ruleConfig = await altinnAppGitRepository.GetRuleConfiguration(layoutSetName);
            return ruleConfig;
        }

        /// <inheritdoc />
        public async Task SaveRuleConfig(string org, string app, string developer, JsonNode ruleConfig, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets && string.IsNullOrEmpty(layoutSetName))
            {
                throw new BadHttpRequestException("This app uses layout sets, but no layout set name was provided for this request");
            }
            await altinnAppGitRepository.SaveRuleConfiguration(layoutSetName, ruleConfig);
        }
    }
}
