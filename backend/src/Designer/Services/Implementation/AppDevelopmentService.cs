using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class AppDevelopmentService : IAppDevelopmentService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        public AppDevelopmentService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <inheritdoc />
        public async Task<List<FormLayout>> GetFormLayouts(string org, string app, string developer, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                List<FormLayout> formLayoutsForLayoutSet = await altinnAppGitRepository.GetFormLayouts(layoutSetName);
                return formLayoutsForLayoutSet;
            }

            List<FormLayout> formLayouts = await altinnAppGitRepository.GetFormLayouts(null);
            return formLayouts;
        }

        /// <inheritdoc />
        public async Task<FormLayout> GetFormLayout(string org, string app, string developer, string layoutSetName, string layoutName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                FormLayout formLayoutForLayoutSet = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);
                return formLayoutForLayoutSet;
            }

            FormLayout formLayout = await altinnAppGitRepository.GetLayout(null, layoutName);
            return formLayout;
        }

        /// <inheritdoc />
        public async Task SaveFormLayout(string org, string app, string developer, string layoutSetName, string layoutName, FormLayout formLayout)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                await altinnAppGitRepository.SaveLayout(layoutSetName, layoutName, formLayout);
            }

            await altinnAppGitRepository.SaveLayout(null, layoutName, formLayout);
        }

        /// <inheritdoc />
        public void DeleteFormLayout(string org, string app, string developer, string layoutSetName, string layoutName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                altinnAppGitRepository.DeleteLayout(layoutSetName, layoutName);
            }

            altinnAppGitRepository.DeleteLayout(null, layoutName);
        }

        /// <inheritdoc />
        public void UpdateFormLayoutName(string org, string app, string developer, string layoutSetName, string layoutName, string newName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                altinnAppGitRepository.UpdateFormLayoutName(layoutSetName, layoutName, newName);
            }

            altinnAppGitRepository.UpdateFormLayoutName(null, layoutName, newName);
        }

        /// <inheritdoc />
        public async Task<LayoutSettings> GetLayoutSettings(string org, string app, string developer, string layoutSetName)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                LayoutSettings layoutSettingsForLayoutSet = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetName);
                return layoutSettingsForLayoutSet;
            }

            LayoutSettings layoutSettings = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(null);
            return layoutSettings;
        }

        /// <inheritdoc />
        public async Task SaveLayoutSettings(string org, string app, string developer, LayoutSettings layoutSettings, string layoutSetName)
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
    }
}
