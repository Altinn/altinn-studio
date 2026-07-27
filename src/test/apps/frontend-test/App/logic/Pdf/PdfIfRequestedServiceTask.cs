using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
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
        private readonly IProcessReader _processReader;

        public PdfIfRequestedServiceTask(IPdfService pdfService, IProcessReader processReader)
        {
            _pdfService = pdfService;
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
                // Honour the task's pdfConfig (autoPdfTaskIds / filename) exactly like the built-in
                // "pdf" service task. autoPdfTaskIds tells the frontend which data task to render.
                var taskId = mutator.Instance.Process.CurrentTask.ElementId;
                var pdfConfig = _processReader.GetAltinnTaskExtension(taskId)?.PdfConfiguration;

                await _pdfService.GenerateAndStorePdf(
                    mutator,
                    pdfConfig?.FilenameTextResourceKey,
                    pdfConfig?.AutoPdfTaskIds,
                    StorageAuthenticationMethod.ServiceOwner(),
                    context.CancellationToken
                );
            }

            return ServiceTaskResult.Success();
        }
    }
}
