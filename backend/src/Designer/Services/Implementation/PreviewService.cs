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
    public const string MockDataModelIdPrefix = "MockDataModel";
    public const string MockDataTaskId = "test-datatask-id";

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
    public PreviewService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    /// <inheritdoc />
    public async Task<Instance> GetMockInstance(string org, string app, string developer, int? instanceOwnerPartyId, string layoutSetName, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        Application applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(cancellationToken);
        string task = await GetTaskForLayoutSetName(org, app, developer, layoutSetName, cancellationToken);
        bool shouldProcessActAsReceipt = task == Constants.General.CustomReceiptId;
        // RegEx for instance guid in app-frontend: [\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}
        string instanceGuid = "f1e23d45-6789-1bcd-8c34-56789abcdef0";
        ProcessState processState = shouldProcessActAsReceipt
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
        Instance instance = new()
        {
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId == null ? "undefined" : instanceOwnerPartyId.Value.ToString() },
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = applicationMetadata.Id,
            Data = await GetDataTypesForInstance(org, app, developer, layoutSetName, shouldProcessActAsReceipt),
            Org = applicationMetadata.Org == developer ? "ttd" : applicationMetadata.Org,
            Process = processState,
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

    /// <inheritdoc />
    public async Task<List<string>> GetTasksForAllLayoutSets(string org, string app, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        try
        {
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
            List<string> tasks = [];
            if (layoutSets?.Sets is { Count: > 0 })
            {
                foreach (LayoutSetConfig layoutSet in layoutSets.Sets.Where(ls => !tasks.Contains(ls.Tasks?[0])))
                {
                    if (layoutSet.Tasks?[0] == Constants.General.CustomReceiptId)
                    {
                        continue;
                    }
                    if (layoutSet.Tasks != null)
                    {
                        tasks.Add(layoutSet.Tasks[0]);
                    }
                }
            }
            return tasks;
        }
        catch (NotFoundException)
        {
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<string> GetTaskForLayoutSetName(string org, string app, string developer, string layoutSetName, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        string task = "Task_1";
        if (!string.IsNullOrEmpty(layoutSetName))
        {
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
            task = layoutSets?.Sets?.Find(element => element.Id == layoutSetName).Tasks?[0];
        }
        return task;
    }

    private async Task<List<DataElement>> GetDataTypesForInstance(string org, string app, string developer, string layoutSetName, bool shouldProcessActAsReceipt)
    {
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
        DataType dataType = await GetDataTypeForLayoutSetName(org, app, developer, layoutSetName);
        string dataTypeForDataElement = shouldProcessActAsReceipt ? await GetDataTypeForCustomReceipt(altinnAppGitRepository) : dataType?.Id;
        if (dataTypeForDataElement is null && altinnAppGitRepository.AppUsesLayoutSets())
        {
            int counter = 0;
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile();
            return layoutSets.Sets
                .Where(set => string.IsNullOrEmpty(set.DataType))
                .Select(_ => new DataElement
                {
                    DataType = $"{MockDataModelIdPrefix}-{counter++}",
                    Id = MockDataTaskId
                })
                .ToList();
        }
        return [
            // All data types attached to the current task in the process model should be added here
            new DataElement
            {
                DataType = dataTypeForDataElement,
                Id = MockDataTaskId
            }
            ];
    }

    private async Task<string> GetDataTypeForCustomReceipt(AltinnAppGitRepository altinnAppGitRepository)
    {
        LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile();
        string dataType = layoutSets?.Sets?.Find(set => set.Tasks[0] == Constants.General.CustomReceiptId)?.DataType;
        return dataType ?? string.Empty;
    }
}
