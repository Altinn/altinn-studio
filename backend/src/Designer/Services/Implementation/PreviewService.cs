using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Interface for dealing with texts in new format in an app repository.
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

    public async Task<Application> GetApplication(string org, string app, string developer)
    {
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        Application mockApplicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
        return mockApplicationMetadata;
    }

    public Instance CreateMockInstance(string org, string app, string developer, int? instanceOwnerPartyId)
    {
        Instance instance = new()
        {
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.Value.ToString() },
            Id = $"{instanceOwnerPartyId}/test-id",
            Data = new()
                { new ()
                {
                    DataType = "Task_1",
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
}
