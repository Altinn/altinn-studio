using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services.Domain;

/// <summary>
/// Loads and caches domain reference data from the mounted /etc/augmenter/domain/ folder.
/// Lookup methods translate raw application inputs into the normalized values consumed
/// by mappers, prompts, and templates. Edit the JSON files in config/domain/ to support
/// new kommuner, alkohol-grupper, or sjekkliste-punkter without rebuilding the image.
/// </summary>
public sealed class DomainDataProvider
{
    private readonly Lazy<KommunerData> _kommuner;
    private readonly Lazy<BevillingstyperData> _bevillingstyper;
    private readonly Lazy<AlkoholgrupperData> _alkoholgrupper;
    private readonly Lazy<SjekklisteData> _sjekkliste;

    public DomainDataProvider(IOptions<ContentPathsOptions> contentPaths)
    {
        var root = contentPaths.Value.DomainRoot;
        _kommuner        = new(() => LoadJson<KommunerData>(Path.Combine(root, "kommuner.json")));
        _bevillingstyper = new(() => LoadJson<BevillingstyperData>(Path.Combine(root, "bevillingstyper.json")));
        _alkoholgrupper  = new(() => LoadJson<AlkoholgrupperData>(Path.Combine(root, "alkoholgrupper.json")));
        _sjekkliste      = new(() => LoadJson<SjekklisteData>(Path.Combine(root, "sjekkliste.json")));
    }

    public KommunerData Kommuner => _kommuner.Value;
    public BevillingstyperData Bevillingstyper => _bevillingstyper.Value;
    public AlkoholgrupperData Alkoholgrupper => _alkoholgrupper.Value;
    public SjekklisteData Sjekkliste => _sjekkliste.Value;

    public KommuneEntry LookupKommune(string? kommunenummer)
    {
        if (kommunenummer != null && Kommuner.Kommuner.TryGetValue(kommunenummer, out var entry))
            return entry;
        return Kommuner.Default;
    }

    public string MapBevillingstype(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return Bevillingstyper.Default;
        return Bevillingstyper.Mapping.TryGetValue(input, out var mapped)
            ? mapped
            : Bevillingstyper.Default;
    }

    public string MapAlkoholgruppeChecklist(string? input)
        => ApplyRules(input, Alkoholgrupper.Checklist.Rules, Alkoholgrupper.Checklist.Default);

    private static string ApplyRules(string? input, IEnumerable<MappingRule> rules, string @default)
    {
        if (string.IsNullOrEmpty(input))
        {
            var fallback = rules.FirstOrDefault(r => r.Fallback);
            return fallback?.Value ?? @default;
        }

        var normalized = input.ToLowerInvariant().Replace(" ", "").Replace("-", "");
        foreach (var rule in rules)
        {
            if (rule.Fallback)
                continue;

            var matches = rule.RequireAll
                ? rule.Contains.All(c => normalized.Contains(c, StringComparison.OrdinalIgnoreCase))
                : rule.Contains.Any(c => normalized.Contains(c, StringComparison.OrdinalIgnoreCase));

            if (matches)
                return rule.Value;
        }

        var defaultRule = rules.FirstOrDefault(r => r.Fallback);
        return defaultRule?.Value ?? @default;
    }

    private static T LoadJson<T>(string path)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException($"Domain data file not found: {path}");

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        }) ?? throw new InvalidOperationException($"Domain data file is empty or invalid JSON: {path}");
    }
}
