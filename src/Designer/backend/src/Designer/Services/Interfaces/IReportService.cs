using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IReportService
{
    Task GenerateReportPdfAsync(
        string org,
        string environment,
        ReportFrequency frequency,
        CancellationToken cancellationToken = default
    );
}
