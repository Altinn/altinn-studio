using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
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
    public async Task<Instance> GetMockInstance(string org, string app, string developer, int? instanceOwnerPartyId, string layoutSetName)
    {
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        Application applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
        DataType dataType = await GetDataTypeForLayoutSetName(org, app, developer, layoutSetName);
        string task = await GetTaskForLayoutSetName(org, app, developer, layoutSetName);
        // RegEx for instance guid in app-frontend: [\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}
        string instanceGuid = "f1e23d45-6789-1bcd-8c34-56789abcdef0";
        Instance instance = new()
        {
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId == null ? "undefined" : instanceOwnerPartyId.Value.ToString() },
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = applicationMetadata.Id,
            Data = new List<DataElement>
            { new ()
                // All data types attached to the current task in the process model should be added here
                    {
                        DataType = dataType?.Id,
                        Id = "test-datatask-id"
                    }
                },
            Org = applicationMetadata.Org == developer ? "ttd" : applicationMetadata.Org,
            Process = new()
            {
                CurrentTask = new()
                {
                    AltinnTaskType = "data",
                    ElementId = task
                }
            }
        };
        return instance;
    }

    /// <summary>
    /// Gets the datatype from application metadata that corresponds to the current data task in the process based on the current layout set name
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="layoutSetName">LayoutSetName to get dataType for</param>
    public async Task<DataType> GetDataTypeForLayoutSetName(string org, string app, string developer, string layoutSetName)
    {
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        string task = await GetTaskForLayoutSetName(org, app, developer, layoutSetName);
        Application applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
        if (applicationMetadata.DataTypes is { Count: > 0 })
        {
            DataType dataType = applicationMetadata.DataTypes.Find(element => !string.IsNullOrEmpty(element.AppLogic?.ClassRef) && element.TaskId == task);
            return dataType;
        }
        return null;
    }

    /// <summary>
    /// Gets the task connected to the current layout set name in the layout sets file
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="layoutSetName">LayoutSetName to get dataType for</param>
    /// <returns></returns>
    private async Task<string> GetTaskForLayoutSetName(string org, string app, string developer, string layoutSetName)
    {
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        string task = "Task_1";
        if (!string.IsNullOrEmpty(layoutSetName))
        {
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile();
            task = layoutSets?.Sets?.Find(element => element.Id == layoutSetName).Tasks[0];
        }
        return task;
    }
}
