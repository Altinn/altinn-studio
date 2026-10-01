using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Linq;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Exceptions.ProcessEditing;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.PolicyAdmin;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation.ProcessModeling;

/// <inheritdoc/>
/// <remarks>
/// Callers must serialize saves for each developer and repository.
/// </remarks>
public sealed class ProcessEditingService(
    IAltinnGitRepositoryFactory repositoryFactory,
    IProcessModelingService processModelingService,
    IUiFoldersService uiFoldersService,
    IRepository policyRepository,
    IPublisher publisher,
    IHubContext<SyncHub, ISyncClient> syncHub,
    ILogger<ProcessEditingService> logger
) : IProcessEditingService
{
    private const string SyncSourceName = "process-state";

    public ProcessState GetState(AltinnRepoEditingContext editingContext) => ReadState(GetRepository(editingContext));

    public async Task<ProcessState> Save(
        AltinnRepoEditingContext editingContext,
        ProcessEditRequest request,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository repository = GetRepository(editingContext);
        ValidatedEdit edit = await ValidateEdit(editingContext, repository, request, cancellationToken);

        cancellationToken.ThrowIfCancellationRequested();
        // Client disconnection must not interrupt the remaining writes. Other failures can still leave a partial edit.
        await Apply(editingContext, repository, edit);
        await NotifyClients(editingContext, edit);
        return ReadState(repository);
    }

    private async Task<ValidatedEdit> ValidateEdit(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        ProcessEditRequest request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            ValidateRequest(request);
            ProcessState current = ReadState(repository);
            if (current.Version != request.ExpectedVersion)
            {
                throw new ProcessEditConflictException(
                    "The app has changed. Reload the process before making more changes."
                );
            }
            return await Validate(editingContext, repository, current, request, cancellationToken);
        }
        catch (Exception exception) when (IsValidationError(exception))
        {
            throw new ProcessEditValidationException(exception.Message, exception);
        }
    }

    // Derived ArgumentException types can indicate bugs rather than invalid editor input.
    private static bool IsValidationError(Exception exception) =>
        exception.GetType() == typeof(ArgumentException)
        || exception is InvalidLayoutSetIdException or NonUniqueLayoutSetIdException;

    private static void ValidateRequest(ProcessEditRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ExpectedVersion))
        {
            throw new ProcessEditValidationException("An expected version is required.");
        }
        int operations = new object?[]
        {
            request.LayoutSetCreation,
            request.LayoutSetDeletion,
            request.LayoutSetRename,
            request.DataTypesChange,
        }.Count(operation => operation is not null);
        TaskIdChange? taskIdChange = request.Metadata?.TaskIdChange;
        SubformPdfComponentChange? subformPdfComponentChange = request.Metadata?.SubformPdfComponentChange;
        if (operations > 1)
        {
            throw new ProcessEditValidationException(
                "A process edit can contain only one layout set or data type operation."
            );
        }
        if (
            operations == 1
            && (request.BpmnXml is not null || taskIdChange is not null || subformPdfComponentChange is not null)
        )
        {
            throw new ProcessEditValidationException(
                "A layout set or data type operation must be sent without a BPMN snapshot or metadata."
            );
        }
        if (request.BpmnXml is null && taskIdChange is not null)
        {
            throw new ProcessEditValidationException(
                "A task ID change must be sent with the BPMN snapshot that contains it."
            );
        }
        if (request.BpmnXml is null && operations == 0 && subformPdfComponentChange is null)
        {
            throw new ProcessEditValidationException("A process edit must contain a BPMN snapshot or an operation.");
        }
        if (request.LayoutSetCreation is { } creation && string.IsNullOrWhiteSpace(creation.LayoutSetConfigDto?.Id))
        {
            throw new ProcessEditValidationException(
                "A layout set creation requires a layout set configuration with an ID."
            );
        }
        if (request.LayoutSetDeletion is { } deletion && string.IsNullOrWhiteSpace(deletion.LayoutSetIdToUpdate))
        {
            throw new ProcessEditValidationException("A layout set deletion requires the name of the layout set.");
        }
        if (
            request.LayoutSetRename is { } rename
            && (
                string.IsNullOrWhiteSpace(rename.LayoutSetIdToUpdate)
                || string.IsNullOrWhiteSpace(rename.NewLayoutSetId)
            )
        )
        {
            throw new ProcessEditValidationException(
                "A layout set rename requires the current and the new name of the layout set."
            );
        }
        if (
            request.DataTypesChange is { } dataTypes
            && (string.IsNullOrWhiteSpace(dataTypes.ConnectedTaskId) || dataTypes.NewDataTypes is null)
        )
        {
            throw new ProcessEditValidationException("A data type change requires a task and a list of data types.");
        }
        if (
            subformPdfComponentChange is not null
            && (
                string.IsNullOrWhiteSpace(subformPdfComponentChange.TaskId)
                || (
                    subformPdfComponentChange.ComponentId is not null
                        ? string.IsNullOrWhiteSpace(subformPdfComponentChange.ComponentId)
                            || string.IsNullOrWhiteSpace(subformPdfComponentChange.SourceLayoutSetId)
                        : string.IsNullOrWhiteSpace(subformPdfComponentChange.PreviousComponentId)
                )
            )
        )
        {
            throw new ProcessEditValidationException(
                "A subform PDF component change requires a task and either a source component or a previous component to remove."
            );
        }
    }

    private async Task<ValidatedEdit> Validate(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        ProcessState current,
        ProcessEditRequest request,
        CancellationToken cancellationToken
    )
    {
        if (request.LayoutSetCreation is { } creation)
        {
            await uiFoldersService.ValidateNewLayoutSetName(
                editingContext,
                creation.LayoutSetConfigDto.Id,
                cancellationToken
            );
            return new ValidatedEdit { LayoutSetCreation = creation };
        }
        if (request.LayoutSetDeletion is { } deletion)
        {
            if (!repository.LayoutSetFolderExistsByExactName(deletion.LayoutSetIdToUpdate))
            {
                throw new ProcessEditValidationException("The layout set to delete does not exist.");
            }
            return new ValidatedEdit { LayoutSetDeletion = deletion.LayoutSetIdToUpdate };
        }
        if (request.LayoutSetRename is { } rename)
        {
            return await ValidateLayoutSetRename(editingContext, repository, current, rename, cancellationToken);
        }
        if (request.DataTypesChange is { } dataTypes)
        {
            // The handlers also update this layout set's default data type in Settings.json.
            if (!repository.LayoutSetFolderExistsByExactName(dataTypes.ConnectedTaskId))
            {
                throw new ProcessEditValidationException("The task of a data type change must have a layout set.");
            }
            return new ValidatedEdit { DataTypesChange = dataTypes };
        }
        SubformPdfComponentChange? subformPdfComponentChange = request.Metadata?.SubformPdfComponentChange;
        if (request.BpmnXml is not { } bpmnXml)
        {
            return new ValidatedEdit { SubformPdfComponentChange = subformPdfComponentChange };
        }
        ValidatedEdit snapshot = await ValidateSnapshot(
            editingContext,
            repository,
            current,
            bpmnXml,
            request.Metadata?.TaskIdChange,
            cancellationToken
        );
        return snapshot with { SubformPdfComponentChange = subformPdfComponentChange };
    }

    private async Task<ValidatedEdit> ValidateSnapshot(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        ProcessState current,
        string bpmnXml,
        TaskIdChange? taskIdChange,
        CancellationToken cancellationToken
    )
    {
        ProcessSnapshotChange change = ProcessSnapshotChange.Create(current.BpmnXml, bpmnXml, taskIdChange);
        if (taskIdChange is not null)
        {
            await ValidateTaskIdChange(editingContext, repository, taskIdChange, cancellationToken);
        }
        return new ValidatedEdit { TaskIdChange = taskIdChange, ProcessDefinition = new(bpmnXml, change) };
    }

    private async Task ValidateTaskIdChange(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        TaskIdChange taskIdChange,
        CancellationToken cancellationToken
    )
    {
        await uiFoldersService.ValidateTaskIdChange(
            editingContext,
            taskIdChange.OldId,
            taskIdChange.NewId,
            cancellationToken
        );
        // ValidateTaskIdChange checks collisions only for tasks that already have a folder.
        if (UiEntryExists(repository, taskIdChange.NewId))
        {
            throw new ProcessEditValidationException(
                $"The task ID {taskIdChange.NewId} is already the name of a layout set."
            );
        }
        await ValidateFilesUpdatedByTaskIdChange(editingContext, repository, cancellationToken);
    }

    private static bool UiEntryExists(AltinnAppGitRepository repository, string name) =>
        ProcessStateVersion.GetUiEntryNames(repository.RepositoryDirectory) is { } names
        && names.Contains(name, StringComparer.Ordinal);

    // Preflight the parsers used by rename handlers before the folder moves.
    private async Task ValidateFilesUpdatedByTaskIdChange(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        CancellationToken cancellationToken
    )
    {
        await ReadForValidation(
            ProcessStateVersion.ApplicationMetadataPath,
            async () =>
            {
                ApplicationMetadata? metadata = await repository.GetApplicationMetadata(cancellationToken);
                if (metadata?.DataTypes is null)
                {
                    throw new JsonException("The application metadata has no data types.");
                }
            }
        );
        await ReadForValidation(
            ProcessStateVersion.PolicyPath,
            () =>
            {
                XacmlPolicy? policy = policyRepository.GetPolicy(editingContext.Org, editingContext.Repo, null);
                if (policy is not null)
                {
                    PolicyConverter.ConvertPolicy(policy);
                }
                return Task.CompletedTask;
            }
        );
        await ValidateLayoutsCanBeRead(repository, cancellationToken);
    }

    private static async Task ValidateLayoutsCanBeRead(
        AltinnAppGitRepository repository,
        CancellationToken cancellationToken
    )
    {
        if (ProcessStateVersion.GetUiEntryNames(repository.RepositoryDirectory) is null)
        {
            return;
        }
        foreach (string layoutSetName in await repository.GetUiFolders(cancellationToken))
        {
            foreach (string layoutName in repository.GetLayoutNames(layoutSetName))
            {
                await ReadForValidation(
                    $"App/ui/{layoutSetName}/layouts/{layoutName}.json",
                    async () =>
                    {
                        if (await repository.GetLayout(layoutSetName, layoutName, cancellationToken) is null)
                        {
                            throw new JsonException("The layout is empty.");
                        }
                    }
                );
            }
        }
    }

    private static async Task ReadForValidation(string relativePath, Func<Task> read)
    {
        try
        {
            await read();
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new ProcessEditValidationException(
                $"The file {relativePath} cannot be read, so the edit cannot be applied.",
                exception
            );
        }
    }

    private async Task<ValidatedEdit> ValidateLayoutSetRename(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        ProcessState current,
        ProcessLayoutSetRename rename,
        CancellationToken cancellationToken
    )
    {
        string oldName = rename.LayoutSetIdToUpdate;
        string newName = rename.NewLayoutSetId;
        if (!repository.LayoutSetFolderExistsByExactName(oldName))
        {
            throw new ProcessEditValidationException("The layout set to rename does not exist.");
        }
        if (RenameTask(current.BpmnXml, oldName, newName) is { } renamedProcess)
        {
            return await ValidateSnapshot(
                editingContext,
                repository,
                current,
                renamedProcess,
                new TaskIdChange { OldId = oldName, NewId = newName },
                cancellationToken
            );
        }
        // A non-task layout set must not acquire a process element's ID.
        if (HasElementWithId(ProcessDefinitionXml.Parse(current.BpmnXml), newName))
        {
            throw new ProcessEditValidationException($"The name {newName} is already used in the process.");
        }
        await uiFoldersService.ValidateNewLayoutSetName(editingContext, newName, cancellationToken);
        await ValidateLayoutsCanBeRead(repository, cancellationToken);
        return new ValidatedEdit { LayoutSetRename = rename };
    }

    private static string? RenameTask(string bpmnXml, string oldId, string newId)
    {
        XDocument document = ProcessDefinitionXml.Parse(bpmnXml);
        if (!ProcessDefinitionXml.Tasks(document).Any(task => (string?)task.Attribute("id") == oldId))
        {
            return null;
        }
        if (HasElementWithId(document, newId))
        {
            throw new ProcessEditValidationException("The new task ID is already used in the process.");
        }
        // Match UpdateTaskId: change references as well as the task element's ID.
        foreach (
            XAttribute attribute in document
                .Descendants()
                .Attributes()
                .Where(attribute => attribute.Value == oldId)
                .ToArray()
        )
        {
            attribute.Value = newId;
        }
        return Encoding.UTF8.GetString(ProcessDefinitionXml.Serialize(document));
    }

    private static bool HasElementWithId(XDocument document, string id) =>
        document.Descendants().Any(element => (string?)element.Attribute("id") == id);

    private AltinnAppGitRepository GetRepository(AltinnRepoEditingContext editingContext) =>
        repositoryFactory.GetAltinnAppGitRepository(editingContext.Org, editingContext.Repo, editingContext.Developer);

    private static ProcessState ReadState(AltinnAppGitRepository repository)
    {
        using var processDefinition = new MemoryStream();
        using (Stream file = repository.GetProcessDefinitionFile())
        {
            file.CopyTo(processDefinition);
        }
        byte[] content = processDefinition.ToArray();
        processDefinition.Position = 0;
        using var reader = new StreamReader(processDefinition, Encoding.UTF8);
        return new ProcessState(
            reader.ReadToEnd(),
            ProcessStateVersion.Compute(repository.RepositoryDirectory, content)
        );
    }

    private async Task Apply(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        ValidatedEdit edit
    )
    {
        // Run first: the folder service rejects invalid task/component selections before writing.
        if (edit.SubformPdfComponentChange is { } subformPdfComponentChange)
        {
            try
            {
                await publisher.Publish(
                    new SubformPdfComponentChangedEvent
                    {
                        EditingContext = editingContext,
                        Change = subformPdfComponentChange,
                    },
                    CancellationToken.None
                );
            }
            catch (Exception exception) when (IsInvalidSubformPdfComponentChange(exception))
            {
                throw new ProcessEditValidationException(exception.Message, exception);
            }
        }
        if (edit.LayoutSetCreation is { } creation)
        {
            await uiFoldersService.AddLayoutSet(
                editingContext,
                creation.LayoutSetConfigDto.ToLayoutSetConfig(),
                creation.TaskType,
                CancellationToken.None,
                publisherNotifies: true
            );
        }
        if (edit.LayoutSetDeletion is { } layoutSetName)
        {
            await uiFoldersService.DeleteLayoutSet(
                editingContext,
                layoutSetName,
                CancellationToken.None,
                publisherNotifies: true
            );
        }
        if (edit.LayoutSetRename is { } rename)
        {
            await RenameLayoutSet(editingContext, repository, rename);
        }
        if (edit.DataTypesChange is { } dataTypes)
        {
            await publisher.Publish(
                new ProcessDataTypesChangedEvent
                {
                    EditingContext = editingContext,
                    ConnectedTaskId = dataTypes.ConnectedTaskId,
                    NewDataTypes = dataTypes.NewDataTypes,
                    PublisherNotifies = true,
                },
                CancellationToken.None
            );
        }
        if (edit.ProcessDefinition is not { } processDefinition)
        {
            return;
        }
        // Move only the folder before publishing; UpdateLayoutSetName also writes BPMN and publishes events.
        if (edit.TaskIdChange is { } taskIdChange && repository.LayoutSetFolderExistsByExactName(taskIdChange.OldId))
        {
            await RenameFolderThen(
                repository,
                taskIdChange.OldId,
                taskIdChange.NewId,
                () => ApplyAfterFolderRename(editingContext, edit.TaskIdChange, processDefinition)
            );
        }
        else
        {
            await ApplyAfterFolderRename(editingContext, edit.TaskIdChange, processDefinition);
        }
    }

    private static bool IsInvalidSubformPdfComponentChange(Exception exception) =>
        exception
            is SubformComponentNotFoundException
                or SubformComponentMissingLayoutSetException
                or SubformMissingDefaultDataTypeException
                or LayoutSetIsNotSubformPdfTaskException
                or InvalidLayoutSetIdException;

    // Restoring the folder name does not undo ancillary writes; clients must reload after failure.
    private async Task RenameFolderThen(
        AltinnAppGitRepository repository,
        string oldName,
        string newName,
        Func<Task> applyRest
    )
    {
        repository.ChangeLayoutSetFolderName(oldName, newName, CancellationToken.None);
        try
        {
            await applyRest();
        }
        catch
        {
            try
            {
                repository.ChangeLayoutSetFolderName(newName, oldName, CancellationToken.None);
            }
            catch (Exception rollbackException)
            {
                logger.LogError(
                    rollbackException,
                    "Could not rename a layout set folder back after a process edit failed."
                );
            }
            throw;
        }
    }

    private async Task ApplyAfterFolderRename(
        AltinnRepoEditingContext editingContext,
        TaskIdChange? taskIdChange,
        ProcessDefinitionToSave processDefinition
    )
    {
        if (taskIdChange is not null)
        {
            await publisher.Publish(
                new ProcessTaskIdChangedEvent
                {
                    EditingContext = editingContext,
                    OldId = taskIdChange.OldId,
                    NewId = taskIdChange.NewId,
                    PublisherNotifies = true,
                },
                CancellationToken.None
            );
        }
        // Keep BPMN last so ancillary-write failures leave the saved process unchanged.
        await SaveProcessDefinition(editingContext, processDefinition.BpmnXml, processDefinition.Change);
    }

    private Task RenameLayoutSet(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        ProcessLayoutSetRename rename
    ) =>
        RenameFolderThen(
            repository,
            rename.LayoutSetIdToUpdate,
            rename.NewLayoutSetId,
            () =>
                publisher.Publish(
                    new LayoutSetIdChangedEvent
                    {
                        EditingContext = editingContext,
                        LayoutSetName = rename.LayoutSetIdToUpdate,
                        NewLayoutSetName = rename.NewLayoutSetId,
                        PublisherNotifies = true,
                    },
                    CancellationToken.None
                )
        );

    private async Task SaveProcessDefinition(
        AltinnRepoEditingContext editingContext,
        string bpmnXml,
        ProcessSnapshotChange change
    )
    {
        // Preserve submitted bytes unless the document or its declared encoding must change.
        byte[] content =
            change.DocumentModified || !DeclaresUtf8(change.Document)
                ? change.SerializeDocument()
                : Encoding.UTF8.GetBytes(bpmnXml);
        await using var stream = new MemoryStream(content);
        await processModelingService.SaveProcessDefinitionAsync(editingContext, stream, CancellationToken.None);
    }

    private static bool DeclaresUtf8(XDocument document) =>
        document.Declaration?.Encoding is not { } encoding
        || string.Equals(encoding, "utf-8", StringComparison.OrdinalIgnoreCase);

    private async Task NotifyClients(AltinnRepoEditingContext editingContext, ValidatedEdit edit)
    {
        string sourceName = edit.WritesOnlyTheProcessDefinition
            ? Path.GetFileName(ProcessStateVersion.ProcessDefinitionPath)
            : SyncSourceName;
        try
        {
            await syncHub
                .Clients.Group(editingContext.Developer)
                .FileSyncSuccess(new SyncSuccess(new Source(sourceName, ProcessStateVersion.ProcessDefinitionPath)));
        }
        catch (Exception exception)
        {
            // Notification failure must not turn a saved edit into a failed response.
            logger.LogWarning(exception, "Could not notify clients after saving a process edit.");
        }
    }

    private sealed record ValidatedEdit
    {
        public SubformPdfComponentChange? SubformPdfComponentChange { get; init; }
        public LayoutSetPayload? LayoutSetCreation { get; init; }
        public string? LayoutSetDeletion { get; init; }
        public ProcessLayoutSetRename? LayoutSetRename { get; init; }
        public DataTypesChange? DataTypesChange { get; init; }
        public TaskIdChange? TaskIdChange { get; init; }
        public ProcessDefinitionToSave? ProcessDefinition { get; init; }

        public bool WritesOnlyTheProcessDefinition =>
            ProcessDefinition is not null && TaskIdChange is null && SubformPdfComponentChange is null;
    }

    private sealed record ProcessDefinitionToSave(string BpmnXml, ProcessSnapshotChange Change);
}
