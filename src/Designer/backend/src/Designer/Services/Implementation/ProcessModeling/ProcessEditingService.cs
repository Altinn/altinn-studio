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
            string bpmnXml =
                request.BpmnXml ?? throw new ProcessEditValidationException("A BPMN snapshot is required.");
            ProcessState current = ReadState(repository);
            if (current.Version != request.ExpectedVersion)
            {
                throw new ProcessEditConflictException(
                    "The app has changed. Reload the process before making more changes."
                );
            }
            return await ValidateSnapshot(
                editingContext,
                repository,
                current,
                bpmnXml,
                request.Metadata?.TaskIdChange,
                cancellationToken
            );
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
        if (request.Metadata?.SubformPdfComponentChange is not null)
        {
            throw new ProcessEditValidationException("Subform PDF changes are not supported by this endpoint.");
        }
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
        // Move only the folder before publishing; UpdateLayoutSetName also writes BPMN and publishes events.
        if (edit.TaskIdChange is { } taskIdChange && repository.LayoutSetFolderExistsByExactName(taskIdChange.OldId))
        {
            await RenameFolderThen(
                repository,
                taskIdChange.OldId,
                taskIdChange.NewId,
                () => ApplyAfterFolderRename(editingContext, edit)
            );
        }
        else
        {
            await ApplyAfterFolderRename(editingContext, edit);
        }
    }

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

    private async Task ApplyAfterFolderRename(AltinnRepoEditingContext editingContext, ValidatedEdit edit)
    {
        if (edit.TaskIdChange is { } taskIdChange)
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
        await SaveProcessDefinition(editingContext, edit.ProcessDefinition.BpmnXml, edit.ProcessDefinition.Change);
    }

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
        public TaskIdChange? TaskIdChange { get; init; }
        public required ProcessDefinitionToSave ProcessDefinition { get; init; }

        public bool WritesOnlyTheProcessDefinition => TaskIdChange is null;
    }

    private sealed record ProcessDefinitionToSave(string BpmnXml, ProcessSnapshotChange Change);
}
