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
    public async Task<Instance> CreateMockInstance(string org, string app, string developer, int? instanceOwnerPartyId)
    {
        DataType dataType = await GetDataTypeForTask1(org, app, developer);
        Instance instance = new()
        {
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId == null ? "undefined" : instanceOwnerPartyId.Value.ToString() },
            Id = $"{instanceOwnerPartyId}/test-id",
            Data = new()
                { new ()
                {
                    DataType = dataType.Id,
                    Id = "test-datatask-id"
                } },
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
        DataType dataType = mockApplicationMetadata.DataTypes.Find(element => !string.IsNullOrEmpty(element.AppLogic?.ClassRef) && element.TaskId == "Task_1");
        return dataType;
    }
}
