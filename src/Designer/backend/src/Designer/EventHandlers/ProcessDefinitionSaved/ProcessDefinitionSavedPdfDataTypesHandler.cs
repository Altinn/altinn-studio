using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessDefinitionSaved;

/// <summary>
/// Keeps the pdf data types a process declares registered in the application metadata as accepting pdf.
/// </summary>
/// <remarks>
/// A signing task with a <c>signingPdfDataType</c> and a payment task with a
/// <c>paymentReceiptPdfDataType</c> both have the app runtime generate a pdf and write it to that data
/// type when the task ends. The runtime fails the task when the data type is missing from the
/// application metadata, and fails it again when the data type does not accept <c>application/pdf</c>,
/// both after the user has done the work. Studio registers these data types when the task is added,
/// but apps built before it did carry the defect permanently, so saving the process repairs them.
///
/// The repair is deliberately narrow: it only ever adds what the saved BPMN itself names, and it never
/// rewrites configuration a developer may have chosen. See <see cref="TryRepairPdfDataType"/>.
///
/// This is a read-modify-write of <c>applicationmetadata.json</c>, and it is not the only one in flight:
/// the process editor posts the data types a newly added task needs and puts the BPMN without awaiting
/// one another, so adding a signing task issues several writers of that file at once. What keeps them
/// from overwriting each other is <c>RequestSynchronizationMiddleware</c> together with the endpoint
/// whitelist in <c>EndpointNameSyncEligibilityEvaluator</c>, which serializes the requests of one
/// developer on one repository. That whitelist is load-bearing for this handler, not an optimization:
/// dropping the process definition endpoint from it would let this repair lose the editor's own writes.
/// </remarks>
public class ProcessDefinitionSavedPdfDataTypesHandler : INotificationHandler<ProcessDefinitionSavedEvent>
{
    /// <summary>
    /// The content type the runtime writes the generated pdf with. The runtime compares it against
    /// <see cref="DataType.AllowedContentTypes"/> as an exact string, so the repair writes it exactly.
    /// </summary>
    private const string PdfContentType = "application/pdf";

    /// <summary>
    /// Only the app itself writes a generated pdf, which is what the process editor states when it
    /// registers one of these data types on task add.
    /// </summary>
    private const string AppOwnedContributor = "app:owned";

    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ProcessDefinitionSavedPdfDataTypesHandler(
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor
    )
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ProcessDefinitionSavedEvent notification, CancellationToken cancellationToken)
    {
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.ApplicationMetadataDataTypeSyncError,
            "App/config/applicationmetadata.json",
            async () =>
            {
                AltinnAppGitRepository repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer
                );

                // Reading the process here means a document that is well formed XML but not a BPMN
                // definition surfaces as a sync error naming applicationmetadata.json, which is the file
                // this handler may write rather than the one at fault. The save endpoint only validates
                // that the uploaded file is XML, so the editor cannot produce that document, and no
                // error code describes it; a hand-crafted request is the only way to see it.
                List<PdfDataTypeDeclaration> declarations = DeclaredPdfDataTypes(repository.GetProcessDefinitions());
                if (declarations.Count == 0)
                {
                    return false;
                }

                ApplicationMetadata applicationMetadata = await repository.GetApplicationMetadata(cancellationToken);
                if (!TryRepairPdfDataTypes(applicationMetadata, declarations))
                {
                    return false;
                }

                await repository.SaveApplicationMetadata(applicationMetadata);
                return true;
            }
        );
    }

    /// <summary>
    /// The pdf data type ids the process names, each with the task that names it. A task type is not
    /// consulted. The declaration is what the runtime needs to write a generated pdf at all, so acting on
    /// every declaration cannot miss a task that needs one. It is deliberately broader than the runtime's
    /// own condition, which also requires the task to be a signing or payment task: a declaration written
    /// by hand onto some other task gets an entry the runtime will never write to. Broader is the safe
    /// direction for a repair that only ever adds, and it keeps the repair free of a task type taxonomy
    /// that has already changed once. Nothing is derived, guessed or defaulted here.
    /// </summary>
    private static List<PdfDataTypeDeclaration> DeclaredPdfDataTypes(Definitions? definitions)
    {
        List<PdfDataTypeDeclaration> declarations = [];
        foreach (ProcessTask task in definitions?.Process?.AllTasks() ?? [])
        {
            AltinnTaskExtension? taskExtension = task.ExtensionElements?.TaskExtension;
            AddDeclaration(declarations, taskExtension?.SignatureConfiguration?.SigningPdfDataType, task.Id);
            AddDeclaration(declarations, taskExtension?.PaymentConfiguration?.PaymentReceiptPdfDataType, task.Id);
        }

        return declarations;
    }

    private static void AddDeclaration(List<PdfDataTypeDeclaration> declarations, string? dataTypeId, string? taskId)
    {
        if (!string.IsNullOrWhiteSpace(dataTypeId) && !string.IsNullOrWhiteSpace(taskId))
        {
            declarations.Add(new PdfDataTypeDeclaration(dataTypeId, taskId));
        }
    }

    private static bool TryRepairPdfDataTypes(
        Application applicationMetadata,
        List<PdfDataTypeDeclaration> declarations
    )
    {
        bool hasChanges = false;
        foreach (PdfDataTypeDeclaration declaration in declarations)
        {
            hasChanges |= TryRepairPdfDataType(applicationMetadata, declaration);
        }

        return hasChanges;
    }

    /// <summary>
    /// Makes the declared data type able to hold the generated pdf, and returns whether that changed
    /// anything. This edits a developer's own file, so it is additive only: a data type that is missing
    /// is added as the process editor would have added it, and one that already exists only ever gains
    /// <see cref="PdfContentType"/> among the content types it already accepts. No other value of an
    /// existing entry is changed, and nothing is ever removed.
    ///
    /// That holds for the values, not for the bytes: saving re-serializes the whole document, so a repair
    /// also writes out the defaults the model carries, moves unmodelled root keys to the end and drops
    /// unmodelled keys inside a data type entry. Every writer of this file does that, but this is the
    /// first one a developer reaches by saving a process, which until now left the file closed.
    /// </summary>
    private static bool TryRepairPdfDataType(Application applicationMetadata, PdfDataTypeDeclaration declaration)
    {
        DataType? registered = applicationMetadata.DataTypes?.Find(dataType => dataType.Id == declaration.DataTypeId);

        if (registered is null)
        {
            applicationMetadata.DataTypes ??= [];
            applicationMetadata.DataTypes.Add(
                new DataType
                {
                    Id = declaration.DataTypeId,
                    AllowedContentTypes = [PdfContentType],
                    AllowedContributors = [AppOwnedContributor],
                    MaxCount = 1,
                    TaskId = declaration.TaskId,
                }
            );
            return true;
        }

        // An absent or empty list is how the runtime is told to accept any content type, so such an
        // entry already holds the pdf. Adding one there would narrow what the app accepts. An absent list
        // deserializes to null rather than an empty one, so both shapes have to pass through here, which
        // is what the pattern below covers.
        if (registered.AllowedContentTypes is not { Count: > 0 })
        {
            return false;
        }

        if (registered.AllowedContentTypes.Contains(PdfContentType))
        {
            return false;
        }

        registered.AllowedContentTypes.Add(PdfContentType);
        return true;
    }

    /// <summary>
    /// A pdf data type id the process names, and the task that names it.
    /// </summary>
    private readonly record struct PdfDataTypeDeclaration(string DataTypeId, string TaskId);
}
