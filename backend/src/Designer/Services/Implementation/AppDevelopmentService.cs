using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class AppDevelopmentService : IAppDevelopmentService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        public AppDevelopmentService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        public async Task<LayoutSettings> GetLayoutSettings(string org, string app, string developer)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            if (appUsesLayoutSets)
            {
                // TODO: Find a way to get correct layoutSetName
                string layoutSetName = altinnAppGitRepository.GetLayoutSetNames()[0];
                LayoutSettings layoutSettingsForLayoutSet = await altinnAppGitRepository.GetLayoutSettings(layoutSetName);
                return layoutSettingsForLayoutSet;
            }

            LayoutSettings layoutSettings = await altinnAppGitRepository.GetLayoutSettings(null);
            return layoutSettings;
        }

        public async Task SaveLayoutSettings(string org, string app, string developer, LayoutSettings layoutSettings)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            //bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();
            //if (appUsesLayoutSets)
            //{
            // TODO: Find a way to get layoutSetName
            // await altinnAppGitRepository.GetLayoutSettings(layoutSetName);
            // return;
            //}

            await altinnAppGitRepository.SaveLayoutSettings(null, layoutSettings);
        }
    }
}
