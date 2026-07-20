using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using static Altinn.Studio.AppConfig.Parsers.JsonRead;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class LayoutSetsParser
{
    public static void Parse(AppModelBuilder app, IAppDirectory dir, bool parseLayouts = true)
    {
        const string uiDir = "App/ui";
        if (!dir.DirectoryExists(uiDir))
            return;

        foreach (var setName in EnumerateUiSubdirs(dir, uiDir))
        {
            var setDir = uiDir + "/" + setName;
            if (!dir.DirectoryExists(setDir + "/layouts"))
                continue;
            var set = new LayoutSetBuilder { Id = setName, Position = new SourceSpan(setDir + "/Settings.json", "") };
            LoadSettings(app, dir, set, setDir);
            LoadLayouts(app, dir, set, setDir, parseLayouts);
            app.LayoutSets.Add(set);
        }

        LoadGlobalSettings(app, dir, uiDir);
    }

    private static IEnumerable<string> EnumerateUiSubdirs(IAppDirectory dir, string uiDir)
    {
        var sets = new HashSet<string>(StringComparer.Ordinal);
        foreach (var file in dir.EnumerateFiles(uiDir, "Settings.json", recursive: true))
        {
            var rel = file.Substring(uiDir.Length + 1);
            var first = rel.Split('/', 2)[0];
            sets.Add(first);
        }
        foreach (var file in dir.EnumerateFiles(uiDir, "*.json", recursive: true))
        {
            var rel = file.Substring(uiDir.Length + 1);
            var parts = rel.Split('/');
            if (parts.Length >= 3 && parts[1] == "layouts")
                sets.Add(parts[0]);
        }
        return sets.OrderBy(s => s, StringComparer.Ordinal);
    }

    private static void LoadSettings(AppModelBuilder app, IAppDirectory dir, LayoutSetBuilder set, string setDir)
    {
        var path = setDir + "/Settings.json";
        var data = dir.ReadAllBytes(path);
        if (data is null)
            return;

        if (!SourceParse.TryJson(app, path, data, out var doc))
            return;
        using var _ = doc;

        var defaultType = TryString(doc.RootElement, "defaultDataType");
        if (!string.IsNullOrEmpty(defaultType))
        {
            var refr = new DataTypeReference(defaultType, new SourceSpan(path, "/defaultDataType"));
            set.DefaultDataReq = refr;
            app.Refs.DataTypes.Add(refr);
        }

        if (
            doc.RootElement.TryGetProperty("components", out var compsEl)
            && compsEl.ValueKind == JsonValueKind.Object
            && compsEl.TryGetProperty("excludeFromPdf", out var compExEl)
            && compExEl.ValueKind == JsonValueKind.Array
        )
        {
            int ci = 0;
            foreach (var c in compExEl.EnumerateArray())
            {
                if (c.ValueKind == JsonValueKind.String && c.GetString() is { Length: > 0 } cid)
                    app.Refs.ComponentIds.Add(
                        new ComponentIdReference(cid, "", new SourceSpan(path, $"/components/excludeFromPdf/{ci}"))
                    );
                ci++;
            }
        }

        if (doc.RootElement.TryGetProperty("pages", out var pagesEl) && pagesEl.ValueKind == JsonValueKind.Object)
        {
            if (pagesEl.TryGetProperty("order", out var orderEl) && orderEl.ValueKind == JsonValueKind.Array)
            {
                int i = 0;
                foreach (var o in orderEl.EnumerateArray())
                {
                    if (o.ValueKind != JsonValueKind.String)
                    {
                        i++;
                        continue;
                    }
                    var v = o.GetString() ?? "";
                    var pf = new PageFileReference(v, new SourceSpan(path, $"/pages/order/{i}"));
                    set.PageFileRefs.Add(pf);
                    app.Refs.PageFiles.Add(pf);
                    i++;
                }
            }
            var pdfLayout = TryString(pagesEl, "pdfLayoutName");
            if (!string.IsNullOrEmpty(pdfLayout))
            {
                var pf = new PageFileReference(pdfLayout, new SourceSpan(path, "/pages/pdfLayoutName"), Ordered: false);
                set.PageFileRefs.Add(pf);
                app.Refs.PageFiles.Add(pf);
            }

            if (pagesEl.TryGetProperty("excludeFromPdf", out var exEl) && exEl.ValueKind == JsonValueKind.Array)
            {
                int ei = 0;
                foreach (var p in exEl.EnumerateArray())
                {
                    if (p.ValueKind == JsonValueKind.String && p.GetString() is { Length: > 0 } pg)
                    {
                        var pf = new PageFileReference(
                            pg,
                            new SourceSpan(path, $"/pages/excludeFromPdf/{ei}"),
                            Ordered: false
                        );
                        set.PageFileRefs.Add(pf);
                        app.Refs.PageFiles.Add(pf);
                    }
                    ei++;
                }
            }

            if (pagesEl.TryGetProperty("navigationTitle", out var navTitleEl))
                CollectNavigationTitle(app, path, "/pages/navigationTitle", navTitleEl);
            if (
                pagesEl.TryGetProperty("taskNavigation", out var taskNavEl)
                && taskNavEl.ValueKind == JsonValueKind.Array
            )
                CollectTaskNavigation(app, path, "/pages/taskNavigation", taskNavEl);

            if (pagesEl.TryGetProperty("groups", out var groupsEl) && groupsEl.ValueKind == JsonValueKind.Array)
            {
                int gi = 0;
                foreach (var g in groupsEl.EnumerateArray())
                {
                    if (TryString(g, "name") is { } groupName && LooksLikeTextKey(groupName))
                        app.Refs.TextResources.Add(
                            new TextResourceReference(
                                groupName,
                                "",
                                "navigation group name",
                                new SourceSpan(path, $"/pages/groups/{gi}/name")
                            )
                        );
                    if (
                        g.TryGetProperty("order", out var groupOrderEl)
                        && groupOrderEl.ValueKind == JsonValueKind.Array
                    )
                    {
                        int pi = 0;
                        foreach (var o in groupOrderEl.EnumerateArray())
                        {
                            if (o.ValueKind != JsonValueKind.String)
                            {
                                pi++;
                                continue;
                            }
                            var v = o.GetString() ?? "";
                            var pf = new PageFileReference(v, new SourceSpan(path, $"/pages/groups/{gi}/order/{pi}"));
                            set.PageFileRefs.Add(pf);
                            app.Refs.PageFiles.Add(pf);
                            pi++;
                        }
                    }
                    gi++;
                }
            }
        }
    }

    private static void LoadGlobalSettings(AppModelBuilder app, IAppDirectory dir, string uiDir)
    {
        var path = uiDir + "/Settings.json";
        var data = dir.ReadAllBytes(path);
        if (data is null)
            return;
        if (!SourceParse.TryJson(app, path, data, out var doc))
            return;
        using var _ = doc;

        if (
            doc.RootElement.TryGetProperty("taskNavigation", out var taskNavEl)
            && taskNavEl.ValueKind == JsonValueKind.Array
        )
            CollectTaskNavigation(app, path, "/taskNavigation", taskNavEl);
        if (doc.RootElement.TryGetProperty("navigationTitle", out var navTitleEl))
            CollectNavigationTitle(app, path, "/navigationTitle", navTitleEl);
    }

    private static void CollectNavigationTitle(AppModelBuilder app, string file, string ptr, JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.String)
        {
            if (el.GetString() is { } title && LooksLikeTextKey(title))
                app.Refs.TextResources.Add(
                    new TextResourceReference(title, "", "navigationTitle", new SourceSpan(file, ptr))
                );
        }
        else if (el.ValueKind == JsonValueKind.Array)
            ExpressionWalker.CollectValue(app, ownerId: "", file, ptr, el);
    }

    private static void CollectTaskNavigation(AppModelBuilder app, string file, string basePtr, JsonElement arr)
    {
        int i = 0;
        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.Object)
            {
                if (TryString(item, "taskId") is { Length: > 0 } taskId)
                    app.Refs.TaskIds.Add(new TaskIdReference(taskId, new SourceSpan(file, $"{basePtr}/{i}/taskId")));
                if (TryString(item, "name") is { } name && LooksLikeTextKey(name))
                    app.Refs.TextResources.Add(
                        new TextResourceReference(
                            name,
                            "",
                            "taskNavigation name",
                            new SourceSpan(file, $"{basePtr}/{i}/name")
                        )
                    );
            }
            i++;
        }
    }

    private static void LoadLayouts(
        AppModelBuilder app,
        IAppDirectory dir,
        LayoutSetBuilder set,
        string setDir,
        bool parseLayouts
    )
    {
        var layoutsDir = setDir + "/layouts";
        if (!dir.DirectoryExists(layoutsDir))
            return;
        var files = dir.EnumerateFiles(layoutsDir, "*.json", recursive: false).ToList();

        foreach (var file in files)
        {
            app.LayoutFiles.Add(file);
            var page = Path.GetFileNameWithoutExtension(file);
            if (parseLayouts)
            {
                LayoutParser.ParseFile(app, dir, set, page, file);
            }
        }
    }
}
