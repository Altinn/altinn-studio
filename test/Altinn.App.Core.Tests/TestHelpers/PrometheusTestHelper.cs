using Prometheus;

namespace Altinn.App.Core.Tests.TestHelpers;

public class PrometheusTestHelper
{
    public static async Task<string> ReadPrometheusMetricsToString()
    {
        MemoryStream memoryStream = new MemoryStream();
        await Metrics.DefaultRegistry.CollectAndExportAsTextAsync(memoryStream);
        using StreamReader reader = new StreamReader(memoryStream);
        memoryStream.Position = 0;
        return reader.ReadToEnd();
    }
}