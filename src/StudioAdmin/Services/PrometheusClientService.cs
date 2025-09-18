using System.Text.Json;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Providers.Interfaces;

namespace Altinn.Studio.Admin.Services;

public sealed class PrometheusClientService(HttpClient? httpClient = null) : IPrometheusClientService
{
    private readonly HttpClient _http = httpClient ?? new HttpClient();
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IEnumerable<AppMetric>> GetSeriesAsync(string promQl, int time, string app, string name, Func<IEnumerable<MetricDataPoint>, double> countFn, Func<double, bool> isError, string step, CancellationToken cancellationToken = default)
    {
        var url = $"api/v1/query_range?query={Uri.EscapeDataString(promQl.ReplaceLineEndings("").Replace("    ", ""))}&start={DateTime.UtcNow.AddMinutes(-time).ToString("o")}&end={DateTime.UtcNow.ToString("o")}&step=" + step;
        using var resp = await _http.GetAsync(url, cancellationToken);
        resp.EnsureSuccessStatusCode();
        var doc = await resp.Content.ReadFromJsonAsync<PrometheusQueryResponse>(JsonOptions, cancellationToken);

        var first = doc?.Data?.Result?.FirstOrDefault();
        var appMetric = new AppMetric
        {
            AppName = app,
            Metrics =
            [
                new Metric
                {
                    Name = name,
                    DataPoints = [],
                    Count = 0,
                    IsError = isError(0)
                }
            ]
        };
        if (first?.Values is { } values)
        {
            var dataPoints = values.Select(row =>
            {
                if (row is JsonElement arr && arr.ValueKind == JsonValueKind.Array && arr.GetArrayLength() == 2)
                {
                    var ts = arr[0].GetDouble();
                    var valueStr = arr[1].GetString();
                    if (double.TryParse(valueStr, System.Globalization.NumberStyles.Float,
                        System.Globalization.CultureInfo.InvariantCulture, out var value))
                    {
                        return new MetricDataPoint
                        {
                            DateTimeOffset = DateTimeOffset.FromUnixTimeSeconds((long)ts),
                            Count = value
                        };
                    }
                }

                return null;
            }).Where(dataPoint => dataPoint is not null)!.Select(dataPoint => dataPoint!);

            var count = countFn(dataPoints);

            appMetric.Metrics =
            [
                new Metric
                {
                    Name = name,
                    DataPoints = dataPoints,
                    Count = count,
                    IsError = isError(count)
                }
            ];
        }

        return [appMetric];
    }
}
