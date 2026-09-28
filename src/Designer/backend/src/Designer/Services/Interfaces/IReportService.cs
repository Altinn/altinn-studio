using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Reports;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IReportService
{
    Task GenerateReportPdfAsync(
        string org,
        string environment,
        ReportFrequency frequency,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the data of a report that is being generated, identified by the token in its render URL.
    /// Returns null when the token is unknown, has expired, or belongs to another org or environment.
    /// </summary>
    Task<ReportData?> GetReportDataAsync(
        string org,
        string environment,
        string token,
        CancellationToken cancellationToken = default
    );
}
