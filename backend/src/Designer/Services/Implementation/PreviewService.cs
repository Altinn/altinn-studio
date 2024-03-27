using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using LibGit2Sharp;

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
    public async Task<Instance> GetMockInstance(string org, string app, string developer, int? instanceOwnerPartyId, string layoutSetName, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        Application applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(cancellationToken);
        DataType dataType = await GetDataTypeForLayoutSetName(org, app, developer, layoutSetName, cancellationToken);
        string task = await GetTaskForLayoutSetName(org, app, developer, layoutSetName, cancellationToken);
        bool processShouldActAsReceipt = task == "CustomReceipt";
        // RegEx for instance guid in app-frontend: [\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}
        string instanceGuid = "f1e23d45-6789-1bcd-8c34-56789abcdef0";
        ProcessState processState = processShouldActAsReceipt
            ? new()
            {
                CurrentTask = null,
                EndEvent = "EndEvent_1",
                Ended = DateTime.Now,
                StartEvent = "StartEvent_1",
                Started = DateTime.Now,
            }
            : new()
            {
                CurrentTask = new()
                {
                    AltinnTaskType = "data",
                    ElementId = task
                }
            };
        InstanceStatus status = processShouldActAsReceipt
            ? new()
            {
                Archived = DateTime.Now,
                IsArchived = true,
                ReadStatus = ReadStatus.Read,
            }
            : new()
            {
                Archived = null,
                IsArchived = false
            };
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
            Process = processState,
            Status = status
        };
        return instance;
    }

    /// <inheritdoc />
    public async Task<DataType> GetDataTypeForLayoutSetName(string org, string app, string developer, string layoutSetName, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        string task = await GetTaskForLayoutSetName(org, app, developer, layoutSetName, cancellationToken);
        Application applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(cancellationToken);
        if (applicationMetadata.DataTypes is { Count: > 0 })
        {
            DataType dataType = applicationMetadata.DataTypes.Find(element => !string.IsNullOrEmpty(element.AppLogic?.ClassRef) && element.TaskId == task);
            return dataType;
        }
        return null;
    }

    public async Task<List<string>> GetTasksForAllLayoutSets(string org, string app, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        try
        {
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
            List<string> tasks = new();
            if (layoutSets?.Sets is { Count: > 0 })
            {
                foreach (LayoutSetConfig layoutSet in layoutSets.Sets.Where(ls => !tasks.Contains(ls.Tasks[0])))
                {
                    if (layoutSet.Tasks[0] == "CustomReceipt")
                    {
                        continue;
                    }

                    tasks.Add(layoutSet.Tasks[0]);
                }
            }
            return tasks;
        }
        catch (NotFoundException)
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the task connected to the current layout set name in the layout sets file
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="layoutSetName">LayoutSetName to get dataType for</param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    public async Task<string> GetTaskForLayoutSetName(string org, string app, string developer, string layoutSetName, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        string task = "Task_1";
        if (!string.IsNullOrEmpty(layoutSetName))
        {
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
            task = layoutSets?.Sets?.Find(element => element.Id == layoutSetName).Tasks[0];
        }
        return task;
    }
}
