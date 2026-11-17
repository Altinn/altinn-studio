using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

/// <summary>
/// Generates a PDF of each entry of a subform, rendered from the subform's UI folder, and adds it to the instance. The
/// entries are the data elements of the folder's <c>defaultDataType</c>. PDFs from an earlier visit to the task are
/// removed when the task starts, not here.
/// </summary>
internal sealed class SubformPdfServiceTask(
    IProcessReader processReader,
    IAppResources appResources,
    IPdfService pdfService,
    ITranslationService translationService,
    ILogger<SubformPdfServiceTask> logger
) : IServiceTask
{
    public string Type => "subformPdf";

    /// <inheritdoc />
    public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context)
    {
        AltinnSubformPdfConfiguration? config = processReader
            .GetAltinnTaskExtension(context.TaskId)
            ?.SubformPdfConfiguration;
        if (config is null)
        {
            return ["A subformPdf task has no <altinn:subformPdfConfig> element."];
        }

        ValidAltinnSubformPdfConfiguration validConfig;
        try
        {
            validConfig = config.Validate();
        }
        catch (ApplicationConfigException e)
        {
            return [e.Message];
        }

        // Checked at startup, since at run time entries that cannot render only show up as PDF generator timeouts
        string? reason = GetUnrenderableConfigurationReason(context.TaskId, validConfig);
        if (reason is not null)
        {
            return [reason];
        }

        // Execute generates a PDF for each data element of this type, and Storage only holds data elements
        // whose type is declared in applicationmetadata.json, so an undeclared type silently generates nothing.
        string dataType = GetSubformDataType(appResources, validConfig);
        if (!context.ApplicationMetadata.DataTypes.Exists(declared => declared.Id == dataType))
        {
            return
            [
                $"Task renders the subform UI folder '{validConfig.SubformUiFolder}', whose defaultDataType "
                    + $"'{dataType}' does not exist in applicationmetadata.json.",
            ];
        }

        return [];
    }

    public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.Finally(Execute);

    /// <summary>
    /// The data type of the subform's entries: the <c>defaultDataType</c> of the subform's UI folder, which the
    /// frontend renders each entry with. <see cref="ValidateConfiguration"/> makes sure the folder has one before the
    /// app starts.
    /// </summary>
    internal static string GetSubformDataType(IAppResources appResources, ValidAltinnSubformPdfConfiguration config) =>
        appResources.GetLayoutSettingsForFolder(config.SubformUiFolder)?.DefaultDataType
        ?? throw new ApplicationConfigException(
            $"The subform UI folder '{config.SubformUiFolder}' has no defaultDataType in its Settings.json."
        );

    /// <summary>
    /// Why the frontend cannot render the subform's entries, or null when it can: the subform UI folder must be a UI
    /// folder of its own, not a task's, with a <c>defaultDataType</c>.
    /// </summary>
    private string? GetUnrenderableConfigurationReason(string taskId, ValidAltinnSubformPdfConfiguration config)
    {
        string uiFolder = config.SubformUiFolder;

        // A task's folder renders the task's own form, so its "entries" would be the main form
        if (processReader.IsProcessTask(uiFolder))
        {
            return $"Subform PDF service task '{taskId}' renders the subform UI folder '{uiFolder}' named in "
                + $"<altinn:subformPdfConfig><altinn:subformUiFolder>, but 'ui/{uiFolder}' is the UI folder of the "
                + $"task '{uiFolder}', not of a subform. Name the UI folder that holds the subform's pages.";
        }

        LayoutSettings? settings = appResources.GetLayoutSettingsForFolder(uiFolder);
        if (settings is null)
        {
            return $"Subform PDF service task '{taskId}' renders the subform UI folder '{uiFolder}' named in "
                + "<altinn:subformPdfConfig><altinn:subformUiFolder>, but the app has no UI folder "
                + $"'ui/{uiFolder}' with a Settings.json.";
        }

        if (string.IsNullOrWhiteSpace(settings.DefaultDataType))
        {
            return $"Subform PDF service task '{taskId}' renders the subform UI folder '{uiFolder}', but "
                + $"'ui/{uiFolder}/Settings.json' has no defaultDataType. Set it to the data type the subform "
                + "stores its entries in.";
        }

        return null;
    }

    public async Task<ServiceTaskResult> Execute(StageContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process.CurrentTask.ElementId;
        Instance instance = dataMutator.Instance;

        logger.LogDebug("Calling PdfService for Subform PDF Service Task {TaskId}.", taskId);

        ValidAltinnSubformPdfConfiguration config = GetValidAltinnSubformPdfConfiguration(taskId);

        string subformDataType = GetSubformDataType(appResources, config);
        string? filenameTextResourceKey = config.FilenameTextResourceKey;
        string subformUiFolder = config.SubformUiFolder;

        List<DataElement> subformDataElements = instance.Data.Where(x => x.DataType == subformDataType).ToList();

        // Generate PDFs sequentially
        foreach (DataElement dataElement in subformDataElements)
        {
            logger.LogDebug(
                "Starting PDF generation for subform data element {DataElementId} in task {TaskId}",
                dataElement.Id,
                taskId
            );

            var subformPdfContext = new SubformPdfContext(subformUiFolder, dataElement.Id);
            // The actor's language, the one the user chose for the transition, or nb if it has none
            byte[] pdf = await pdfService.GenerateSubformPdf(
                instance,
                taskId,
                subformPdfContext,
                dataMutator.Language ?? LanguageConst.Nb,
                authenticationMethod: StorageAuthenticationMethod.ServiceOwner(),
                cancellationToken: context.CancellationToken
            );
            string fileName = await PdfFileNameResolver.GetFileName(
                translationService,
                dataMutator,
                filenameTextResourceKey,
                subformPdfContext
            );

            // Generated from the task, so the PDF is removed if the task starts again, and says which subform it
            // was made from
            dataMutator.AddBinaryDataElement(
                PdfService.PdfElementType,
                PdfService.PdfContentType,
                fileName,
                pdf,
                generatedFromTask: taskId,
                metadata:
                [
                    new() { Key = "subformUiFolder", Value = subformUiFolder },
                    new() { Key = "subformDataElementId", Value = dataElement.Id },
                ]
            );

            logger.LogDebug(
                "Completed PDF generation for subform data element {DataElementId} in task {TaskId}",
                dataElement.Id,
                taskId
            );
        }

        logger.LogDebug("Successfully called PdfService for Subform PDF Service Task {TaskId}.", taskId);

        return new SuccessfulServiceTaskResult();
    }

    private ValidAltinnSubformPdfConfiguration GetValidAltinnSubformPdfConfiguration(string taskId)
    {
        AltinnTaskExtension? altinnTaskExtension = processReader.GetAltinnTaskExtension(taskId);
        AltinnSubformPdfConfiguration? subformPdfConfiguration = altinnTaskExtension?.SubformPdfConfiguration;

        if (subformPdfConfiguration == null)
        {
            throw new ApplicationConfigException(
                "The subformPdfConfig node is missing in the subform pdf process task configuration."
            );
        }

        return subformPdfConfiguration.Validate();
    }
}
