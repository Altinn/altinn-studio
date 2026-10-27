namespace Altinn.Studio.AppConfig.Tests;

internal static class TestMeta
{
    public static string Json(string id = "ttd/x", params string[] dataTypeIds)
    {
        var dataTypes = string.Join(",", dataTypeIds.Select(d => $$"""{"id":"{{d}}"}"""));
        return $$"""{"id":"{{id}}","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{{dataTypes}}]}""";
    }
}
