using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Codelists.SSB.Models;

namespace Altinn.Codelists.SSB;

/// <summary>
/// Base class providing functions for getting codelist.
/// </summary>
public class ClassificationCodelistProvider : IAppOptionsProvider
{
    private readonly IClassificationsClient _classificationsClient;
    private readonly Classification _classification;

    /// <summary>
    /// Initializes a new instance of the <see cref="ClassificationCodelistProvider"/> class.
    /// </summary>
    public ClassificationCodelistProvider(string id, Classification classification, IClassificationsClient classificationsClient)
    {
        Id = id;
        _classification = classification;
        _classificationsClient = classificationsClient;
    }

    /// <inheritdoc/>
    public string Id { get; private set; }

    /// Gets the <see cref="AppOptions"/> based on the provided classification, options id and key value pairs.
    public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
    {
        string? date = keyValuePairs.GetValueOrDefault("date");
        DateOnly dateOnly = date == null ? DateOnly.FromDateTime(DateTime.Today) : DateOnly.Parse(date);
        string level = keyValuePairs.GetValueOrDefault("level") ?? string.Empty;

        var classificationCode = await _classificationsClient.GetClassificationCodes(_classification, language, dateOnly, level);

        string parentCode = keyValuePairs.GetValueOrDefault("parentCode") ?? string.Empty;
        var appOptions = new AppOptions();

        // The api we use doesn't support filtering on partentCode,
        // hence we need to filter afterwards.
        appOptions.Options = string.IsNullOrEmpty(parentCode)
            ? classificationCode.Codes.Select(x => new AppOption() { Value = x.Code, Label = x.Name }).ToList()
            : classificationCode.Codes.Where(c => c.ParentCode == parentCode).Select(x => new AppOption() { Value = x.Code, Label = x.Name }).ToList();

        return appOptions;
    }
}