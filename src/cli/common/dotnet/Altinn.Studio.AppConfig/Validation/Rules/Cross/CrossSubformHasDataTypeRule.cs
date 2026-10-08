using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Cross;

internal sealed class CrossSubformHasDataTypeRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "CROSS-SUBFORM-HAS-DATATYPE",
            "A Subform's folder must declare its data type",
            "A Subform component lists and creates entries of the data type named by "
                + "defaultDataType in the Settings.json of the folder its layoutSet points at. "
                + "Without it the frontend shows a configuration error in place of the Subform. Form "
                + "data types with a maxCount other than 1 that no folder uses are named as candidates "
                + "here instead of being reported by DATATYPE-COUNT.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        var candidates = CandidateDataTypes(app);
        foreach (var folder in FoldersWithoutDataType(app))
        {
            var subforms = app
                .Refs.SubformFolders.Where(r => string.Equals(r.Value, folder.Id, StringComparison.Ordinal))
                .Select(r => r.OwningComponentId)
                .Distinct(StringComparer.Ordinal)
                .ToList();
            yield return Metadata.Report(Message(folder.Id, subforms, candidates), folder.Position);
        }
    }

    internal static IReadOnlyList<DataType> CandidateDataTypes(AppModel app)
    {
        if (FoldersWithoutDataType(app).Count == 0)
            return [];
        var bound = new HashSet<string>(StringComparer.Ordinal);
        foreach (var set in app.LayoutSets)
            if (set.DefaultDataReq is { } dataType)
                bound.Add(dataType.Value);
        return app
            .DataTypes.Where(dt => dt.IsForm && dt.MaxCount is int max && max != 1 && !bound.Contains(dt.Id))
            .ToList();
    }

    private static List<LayoutSet> FoldersWithoutDataType(AppModel app) =>
        app.SubformFolders().Where(s => s.DefaultDataReq is null).ToList();

    private static string Message(string folderId, List<string> subforms, IReadOnlyList<DataType> candidates)
    {
        var message =
            $"subform folder \"{folderId}\" has no defaultDataType in its Settings.json — the frontend shows a "
            + $"configuration error in place of Subform{(subforms.Count == 1 ? "" : "s")} {Quoted(subforms)}";
        return candidates.Count switch
        {
            0 => message,
            1 =>
                $"{message}; data type \"{candidates[0].Id}\" has maxCount {candidates[0].MaxCount} and may be the one it is meant for",
            _ =>
                $"{message}; one of the data types {Quoted(candidates.Select(c => c.Id))} with a maxCount other than 1 may be the one it is meant for",
        };
    }

    private static string Quoted(IEnumerable<string> ids) => string.Join(", ", ids.Select(id => $"\"{id}\""));
}
