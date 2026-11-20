using System.Globalization;
using System.Text;

namespace Altinn.Studio.Observability.Proxy.Tests;

/// <summary>
/// A scrape in the Prometheus text format, as the scraper reads it, so a test checks the names and
/// labels a dashboard or alert rule queries rather than the instruments behind them.
/// </summary>
internal sealed class ScrapedMetrics
{
    private readonly List<Sample> _samples;

    private ScrapedMetrics(string text, List<Sample> samples)
    {
        Text = text;
        _samples = samples;
    }

    public string Text { get; }

    public static ScrapedMetrics Parse(string text)
    {
        var samples = new List<Sample>();
        foreach (var rawLine in text.Split('\n'))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line[0] == '#')
            {
                continue;
            }

            samples.Add(ParseSample(line));
        }

        return new ScrapedMetrics(text, samples);
    }

    /// <summary>The series named <paramref name="name"/> that carry every one of <paramref name="labels"/>.</summary>
    public IReadOnlyList<Sample> Series(string name, params (string Name, string Value)[] labels) =>
        _samples
            .Where(sample =>
                sample.Name == name && labels.All(label => sample.Labels.GetValueOrDefault(label.Name) == label.Value)
            )
            .ToList();

    /// <summary>The sum of <see cref="Series"/>, or 0 when there is none.</summary>
    public double Sum(string name, params (string Name, string Value)[] labels) =>
        Series(name, labels).Sum(sample => sample.Value);

    private static Sample ParseSample(string line)
    {
        var labels = new Dictionary<string, string>(StringComparer.Ordinal);
        var nameEnd = line.IndexOfAny(['{', ' ']);
        var name = line[..nameEnd];
        var position = nameEnd;

        if (line[position] == '{')
        {
            position++;
            while (line[position] != '}')
            {
                var equals = line.IndexOf('=', position);
                var labelName = line[position..equals];
                position = equals + 2;
                var value = new StringBuilder();
                while (line[position] != '"')
                {
                    if (line[position] == '\\')
                    {
                        position++;
                        value.Append(line[position] == 'n' ? '\n' : line[position]);
                    }
                    else
                    {
                        value.Append(line[position]);
                    }

                    position++;
                }

                labels[labelName] = value.ToString();
                position++;
                if (line[position] == ',')
                {
                    position++;
                }
            }

            position++;
        }

        var valueText = line[position..].Trim().Split(' ')[0];
        return new Sample(name, labels, double.Parse(valueText, CultureInfo.InvariantCulture));
    }

    internal sealed record Sample(string Name, IReadOnlyDictionary<string, string> Labels, double Value);
}
