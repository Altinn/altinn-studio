using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Service for handling a mocked instance object for preview mode
/// </summary>
public class PreviewService : IPreviewService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
    public PreviewService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    /// <inherit />
    public async Task<Application> GetApplication(string org, string app, string developer)
    {
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        Application mockApplicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
        return mockApplicationMetadata;
    }

    /// <inherit />
    public async Task<Instance> GetMockInstance(string org, string app, string developer, int? instanceOwnerPartyId)
    {
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        Application applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
        DataType dataType = await GetDataTypeForTask1(org, app, developer);
        // RegEx for instance guid in app-frontend: [\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}
        string instanceGuid = "f1e23d45-6789-1bcd-8c34-56789abcdef0";
        Instance instance = new()
        {
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId == null ? "undefined" : instanceOwnerPartyId.Value.ToString() },
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            Data = new()
                { new ()
                {
                    DataType = dataType?.Id,
                    Id = "test-datatask-id"
                } },
            Org = applicationMetadata.Org == developer ? "ttd" : applicationMetadata.Org,
            Process = new()
            {
                CurrentTask = new()
                {
                    ElementId = "Task_1"
                }
            }
        };
        return instance;
    }

    /// <inherit />
    public async Task<DataType> GetDataTypeForTask1(string org, string app, string developer)
    {
        Application mockApplicationMetadata = await GetApplication(org, app, developer);
        if (mockApplicationMetadata.DataTypes != null && mockApplicationMetadata.DataTypes?.Count > 0)
        {
            DataType dataType = mockApplicationMetadata.DataTypes.Find(element => !string.IsNullOrEmpty(element.AppLogic?.ClassRef) && element.TaskId == "Task_1");
            return dataType;
        }
        return null;
    }
}
