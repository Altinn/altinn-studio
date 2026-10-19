using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Models;

namespace Altinn.App.logic.Pdf
{
    /// <summary>
    /// A conditional PDF service task used only by the frontend-test app. Behaves like the built-in
    /// "pdf" service task, but only generates a PDF when the global <c>PdfSettings</c> model has
    /// <c>CreatePdf == true</c>. This keeps PDF generation (which is slow) off by default in the
    /// Cypress suite, and lets the few tests that need PDFs opt in by setting that flag during Task_1.
    ///
    /// Replaces the old <c>CustomMetaData</c> hack that mutated applicationmetadata at runtime: the
    /// decision now lives in instance data (readable by the out-of-band service task) instead of a
    /// request cookie, and no global metadata is mutated.
    /// </summary>
    public sealed class PdfIfRequestedServiceTask : IServiceTask
    {
        private readonly IPdfService _pdfService;
        private readonly ITranslationService _translationService;
        private readonly IProcessReader _processReader;

        public PdfIfRequestedServiceTask(
            IPdfService pdfService,
            ITranslationService translationService,
            IProcessReader processReader
        )
        {
            _pdfService = pdfService;
            _translationService = translationService;
            _processReader = processReader;
        }

        public string Type => "pdfIfRequested";

        public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
        {
            var mutator = context.InstanceDataMutator;
            var settingsElement = mutator.Instance.Data.FirstOrDefault(d => d.DataType == "PdfSettings");

            var createPdf =
                settingsElement is not null
                && ((PdfSettings)await mutator.GetFormData(settingsElement)).CreatePdf == true;

            if (createPdf)
            {
                // Honor the task's autoPdfTaskIds, which tells the frontend which data task to render.
                var taskId = mutator.Instance.Process.CurrentTask.ElementId;
                var pdfConfig = _processReader.GetAltinnTaskExtension(taskId)?.PdfConfiguration;

                var pdf = await _pdfService.GeneratePdf(
                    mutator.Instance,
                    taskId,
                    mutator.Language ?? "nb",
                    pdfConfig?.AutoPdfTaskIds,
                    authenticationMethod: StorageAuthenticationMethod.ServiceOwner(),
                    cancellationToken: context.CancellationToken
                );
                var appName = await _translationService.TranslateTextKey("appName", mutator);
                var fileName = $"{appName}.pdf";

                // Generated from the task, so the PDF is removed if the task starts again
                mutator.AddBinaryDataElement(
                    "ref-data-as-pdf",
                    "application/pdf",
                    fileName,
                    pdf,
                    generatedFromTask: taskId
                );
            }

            return ServiceTaskResult.Success();
        }
    }
}
