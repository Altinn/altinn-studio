using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

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
            if (appUsesLayoutSets)
            {
                Dictionary<string, JsonNode> formLayoutsForLayoutSet = await altinnAppGitRepository.GetFormLayouts(layoutSetName);
                return formLayoutsForLayoutSet;
            }

            Dictionary<string, JsonNode> formLayouts = await altinnAppGitRepository.GetFormLayouts(null);
            return formLayouts;
        }

        /// <inheritdoc />
        public async Task SaveFormLayout(string org, string app, string developer, string layoutSetName, string layoutName, JsonNode formLayout)
        {
            string layoutFileName = $"{layoutName}.json";
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                await altinnAppGitRepository.SaveLayout(layoutSetName, layoutFileName, formLayout);
            }

            await altinnAppGitRepository.SaveLayout(null, layoutFileName, formLayout);
        }

        /// <inheritdoc />
        public void DeleteFormLayout(string org, string app, string developer, string layoutSetName, string layoutName)
        {
            string layoutFileName = $"{layoutName}.json";
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                altinnAppGitRepository.DeleteLayout(layoutSetName, layoutFileName);
            }

            altinnAppGitRepository.DeleteLayout(null, layoutFileName);
        }

        /// <inheritdoc />
        public void UpdateFormLayoutName(string org, string app, string developer, string layoutSetName, string layoutName, string newName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                altinnAppGitRepository.UpdateFormLayoutName(layoutSetName, $"{layoutName}.json", $"{newName}.json");
            }

            altinnAppGitRepository.UpdateFormLayoutName(null, $"{layoutName}.json", $"{newName}.json");
        }

        /// <inheritdoc />
        public async Task<JsonNode> GetLayoutSettings(string org, string app, string developer, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                var layoutSettingsForLayoutSet = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetName);
                return layoutSettingsForLayoutSet;
            }

            var layoutSettings = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(null);
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

        /// <inheritdoc />
        public async Task<string> GetRuleHandler(string org, string app, string developer, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                string ruleHandlerForLayoutSet = await altinnAppGitRepository.GetRuleHandler(layoutSetName);
                return ruleHandlerForLayoutSet;
            }

            string ruleHandler = await altinnAppGitRepository.GetRuleHandler(null);
            return ruleHandler;
        }

        /// <inheritdoc />
        public async Task SaveRuleHandler(string org, string app, string developer, string ruleHandler, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                await altinnAppGitRepository.SaveRuleHandler(layoutSetName, ruleHandler);
                return;
            }
            await altinnAppGitRepository.SaveRuleHandler(null, ruleHandler);
        }
    }
}
