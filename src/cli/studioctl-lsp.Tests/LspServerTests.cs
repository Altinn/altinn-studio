using System.Globalization;
using System.Text;
using System.Text.Json;
using Altinn.Studio.AppConfigLsp;
using Xunit;

namespace Altinn.Studio.AppConfigLsp.Tests;

public sealed class LspServerTests
{
    // "MissingPage" is on line 5 (1-based) of Settings.json -> 0-based LSP line 4.
    private const string SettingsJson =
        "{\n  \"pages\": {\n    \"order\": [\n      \"Page1\",\n      \"MissingPage\"\n    ]\n  }\n}";

    [Fact]
    public void Initialize_And_DidOpen_PublishRangedDiagnostics()
    {
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/lsp","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", SettingsJson);
        app.WriteFile("App/ui/Task_1/layouts/Page1.json", """{"data":{"layout":[]}}""");

        var messages = RunSession(app.Root, ("App/ui/Task_1/Settings.json", SettingsJson));

        // initialize reply advertises full document sync.
        var init = messages.Single(m => m.TryGetProperty("id", out var id) && id.GetInt32() == 1);
        Assert.Equal(
            1,
            init.GetProperty("result").GetProperty("capabilities").GetProperty("textDocumentSync").GetInt32()
        );

        // didOpen triggers a ranged REF-PAGE-FILE diagnostic on Settings.json.
        var settings = messages
            .Where(m => m.TryGetProperty("method", out var me) && me.GetString() == "textDocument/publishDiagnostics")
            .Select(m => m.GetProperty("params"))
            .Single(p =>
                p.GetProperty("uri").GetString() is { } u && u.EndsWith("Settings.json", StringComparison.Ordinal)
            );

        var diagnostic = settings
            .GetProperty("diagnostics")
            .EnumerateArray()
            .Single(d => d.GetProperty("code").GetString() == "REF-PAGE-FILE");
        var range = diagnostic.GetProperty("range");
        var start = range.GetProperty("start");
        Assert.Equal(4, start.GetProperty("line").GetInt32()); // "MissingPage", 0-based
        Assert.Equal(6, start.GetProperty("character").GetInt32());
        // The range spans the whole "MissingPage" value (13 chars incl. quotes), not a point.
        var end = range.GetProperty("end");
        Assert.Equal(4, end.GetProperty("line").GetInt32());
        Assert.Equal(19, end.GetProperty("character").GetInt32());
        Assert.Equal(1, diagnostic.GetProperty("severity").GetInt32()); // error
    }

    [Fact]
    public void Hover_OnSymbol_ReturnsSymbolCardAndTokenRange()
    {
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/lsp","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", SettingsJson);
        app.WriteFile("App/ui/Task_1/layouts/Page1.json", """{"data":{"layout":[]}}""");
        var settingsUri = app.Uri("App/ui/Task_1/Settings.json");

        // Hover inside "MissingPage" (0-based line 4, char 10).
        var messages = RunSession(
            app.Root,
            ("App/ui/Task_1/Settings.json", SettingsJson),
            NavRequest(2, "textDocument/hover", settingsUri, 4, 10)
        );

        var hover = messages.Single(m => m.TryGetProperty("id", out var id) && id.GetInt32() == 2);
        var value = hover.GetProperty("result").GetProperty("contents").GetProperty("value").GetString();
        Assert.Contains("**Page** `MissingPage`", value); // the symbol card replaces the raw pointer

        // The hover range covers the "MissingPage" token (0-based line 4, chars 6..19).
        var range = hover.GetProperty("result").GetProperty("range");
        Assert.Equal(6, range.GetProperty("start").GetProperty("character").GetInt32());
        Assert.Equal(19, range.GetProperty("end").GetProperty("character").GetInt32());
    }

    // Hovering a text key shows its translated value(s); a non-symbol node keeps the pointer fallback.
    [Fact]
    public void Hover_TextKey_ShowsValue_AndNonSymbolShowsPointer()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"in","type":"Input","textResourceBindings":{"title":"page.title"}}
            ]}}
            """;
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/lsp","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", """{"pages":{"order":["Page1"]}}""");
        app.WriteFile("App/ui/Task_1/layouts/Page1.json", layout);
        app.WriteFile(
            "App/config/texts/resource.nb.json",
            """{"language":"nb","resources":[{"id":"page.title","value":"Tittelen"}]}"""
        );
        var pageUri = app.Uri("App/ui/Task_1/layouts/Page1.json");

        var (kl, kc) = At0(layout, "\"page.title\"", 1);
        var (tl, tc) = At0(layout, "\"Input\"", 1);
        var messages = RunSession(
            app.Root,
            ("App/ui/Task_1/layouts/Page1.json", layout),
            NavRequest(2, "textDocument/hover", pageUri, kl, kc),
            NavRequest(3, "textDocument/hover", pageUri, tl, tc)
        );

        var key = messages.Single(m => m.TryGetProperty("id", out var id) && id.GetInt32() == 2);
        var keyValue = key.GetProperty("result").GetProperty("contents").GetProperty("value").GetString();
        Assert.Contains("**Text key** `page.title`", keyValue);
        Assert.Contains("nb: `Tittelen`", keyValue);

        var plain = messages.Single(m => m.TryGetProperty("id", out var id) && id.GetInt32() == 3);
        Assert.Contains(
            "/data/layout/0/type",
            plain.GetProperty("result").GetProperty("contents").GetProperty("value").GetString()
        ); // no symbol → the pointer fallback
    }

    [Fact]
    public void Definition_References_Completion()
    {
        const string layout = """
            {
              "data": {
                "layout": [
                  { "id": "field-a", "type": "Input", "textResourceBindings": { "title": "key.a" } },
                  { "id": "group", "type": "RepeatingGroup", "dataModelBindings": { "group": "items" }, "children": ["field-a"] }
                ]
              }
            }
            """;
        const string resource = """{ "language": "nb", "resources": [ { "id": "key.a", "value": "A" } ] }""";

        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/nav","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}""");
        app.WriteFile("App/ui/Task_1/layouts/P1.json", layout);
        app.WriteFile("App/config/texts/resource.nb.json", resource);
        var p1Uri = app.Uri("App/ui/Task_1/layouts/P1.json");

        var (defL, defC) = At0(layout, "\"field-a\"", 2); // the children reference
        var (refL, refC) = At0(layout, "\"field-a\"", 1); // the component declaration
        var (compL, compC) = At0(layout, "\"key.a\"", 1); // inside the title value
        var (ccL, ccC) = At0(layout, "\"field-a\"", 2); // the children component reference
        var messages = RunSession(
            app.Root,
            ("App/ui/Task_1/layouts/P1.json", layout),
            NavRequest(2, "textDocument/definition", p1Uri, defL, defC),
            NavRequest(3, "textDocument/references", p1Uri, refL, refC),
            NavRequest(4, "textDocument/completion", p1Uri, compL, compC),
            NavRequest(5, "textDocument/completion", p1Uri, ccL, ccC)
        );

        JsonElement Result(int id) =>
            messages.Single(m => m.TryGetProperty("id", out var i) && i.GetInt32() == id).GetProperty("result");

        // definition: one Location in P1.json (the component declaration).
        var def = Result(2);
        Assert.Equal(1, def.GetArrayLength());
        Assert.EndsWith("P1.json", def[0].GetProperty("uri").GetString());

        // references: the children reference (one site, declaration excluded).
        Assert.Equal(1, Result(3).GetArrayLength());

        // completion: text-resource keys include "key.a".
        var labels = Result(4)
            .GetProperty("items")
            .EnumerateArray()
            .Select(i => i.GetProperty("label").GetString())
            .ToList();
        Assert.Contains("key.a", labels);

        // completion in a component-reference field (children) offers component ids.
        var compLabels = Result(5)
            .GetProperty("items")
            .EnumerateArray()
            .Select(i => i.GetProperty("label").GetString())
            .ToList();
        Assert.Contains("field-a", compLabels);
    }

    [Fact]
    public void Rename_RenamesComponentEverywhere()
    {
        const string layout = """
            {
              "data": {
                "layout": [
                  { "id": "field-a", "type": "Input" },
                  { "id": "group", "type": "RepeatingGroup", "dataModelBindings": { "group": "items" }, "children": ["field-a"] }
                ]
              }
            }
            """;
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/nav","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}""");
        app.WriteFile("App/ui/Task_1/layouts/P1.json", layout);
        var p1Uri = app.Uri("App/ui/Task_1/layouts/P1.json");

        var (l, c) = At0(layout, "\"field-a\"", 1); // on the component declaration
        var messages = RunSession(
            app.Root,
            ("App/ui/Task_1/layouts/P1.json", layout),
            new
            {
                jsonrpc = "2.0",
                id = 2,
                method = "textDocument/rename",
                @params = new
                {
                    textDocument = new { uri = p1Uri },
                    position = new { line = l, character = c },
                    newName = "renamed",
                },
            }
        );

        var result = messages.Single(m => m.TryGetProperty("id", out var i) && i.GetInt32() == 2).GetProperty("result");

        var edits = result
            .GetProperty("changes")
            .EnumerateObject()
            .Single(prop => prop.Name.EndsWith("P1.json", StringComparison.Ordinal))
            .Value;
        Assert.Equal(2, edits.GetArrayLength()); // the id declaration + the children reference
        foreach (var edit in edits.EnumerateArray())
            Assert.Equal("\"renamed\"", edit.GetProperty("newText").GetString());
    }

    [Fact]
    public void Rename_Task_EmitsFolderRenameViaDocumentChanges()
    {
        const string bpmn = "<definitions><process><task id=\"Task_1\"/></process></definitions>";
        const string layout =
            """{"data":{"layout":[{"id":"sum","type":"Summary2","target":{"type":"page","id":"P","taskId":"Task_1"}}]}}""";
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/r","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1"}]}"""
        );
        app.WriteFile("App/config/process/process.bpmn", bpmn);
        app.WriteFile("App/ui/Task_1/Settings.json", """{"pages":{"order":["P"]}}""");
        app.WriteFile("App/ui/Task_1/layouts/P.json", layout);
        var pUri = app.Uri("App/ui/Task_1/layouts/P.json");

        var (l, c) = At0(layout, "\"Task_1\"", 1); // the Summary2 target.taskId
        var result = RunSession(
                app.Root,
                ("App/ui/Task_1/layouts/P.json", layout),
                new
                {
                    jsonrpc = "2.0",
                    id = 2,
                    method = "textDocument/rename",
                    @params = new
                    {
                        textDocument = new { uri = pUri },
                        position = new { line = l, character = c },
                        newName = "Task_One",
                    },
                }
            )
            .Single(m => m.TryGetProperty("id", out var i) && i.GetInt32() == 2)
            .GetProperty("result");

        // A folder rename uses the richer documentChanges form with a RenameFile op into App/ui/Task_One/.
        var ops = result.GetProperty("documentChanges").EnumerateArray().ToList();
        Assert.True(
            ops.Any(x =>
                x.TryGetProperty("kind", out var k)
                && k.GetString() == "rename"
                && x.GetProperty("newUri").GetString() is { } nu
                && nu.Contains("App/ui/Task_One/", StringComparison.Ordinal)
            ),
            "a folder RenameFile op into App/ui/Task_One/ should be present"
        );
    }

    [Fact]
    public void PrepareRename_SelectsWholeHyphenatedIdentifier()
    {
        const string layout = """{ "data": { "layout": [ { "id": "utility-name", "type": "Input" } ] } }""";
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/nav","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}""");
        app.WriteFile("App/ui/Task_1/layouts/P1.json", layout);
        var p1Uri = app.Uri("App/ui/Task_1/layouts/P1.json");

        var (l, c) = At0(layout, "\"utility-name\"", 1);
        var result = RunSession(
                app.Root,
                ("App/ui/Task_1/layouts/P1.json", layout),
                NavRequest(2, "textDocument/prepareRename", p1Uri, l, c)
            )
            .Single(m => m.TryGetProperty("id", out var i) && i.GetInt32() == 2)
            .GetProperty("result");

        // The whole id is selected, not "utility" or "name".
        Assert.Equal("utility-name", result.GetProperty("placeholder").GetString());
        var range = result.GetProperty("range");
        var span =
            range.GetProperty("end").GetProperty("character").GetInt32()
            - range.GetProperty("start").GetProperty("character").GetInt32();
        Assert.Equal("utility-name".Length, span);
    }

    [Fact]
    public void CodeAction_OffersDidYouMeanQuickFix()
    {
        const string layout =
            """{ "data": { "layout": [ { "id": "a", "type": "Input", "dataModelBindings": { "simpleBinding": "Project.Address" } } ] } }""";
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/s","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}""");
        app.WriteFile("App/ui/Task_1/layouts/P1.json", layout);
        app.WriteFile(
            "App/models/model.schema.json",
            """{"properties":{"project":{"type":"object","properties":{"address":{"type":"string"}}}}}"""
        );
        var p1Uri = app.Uri("App/ui/Task_1/layouts/P1.json");
        var (line, ch, endCh) = TokenRange(layout, "\"Project.Address\"");

        var diag = new
        {
            range = new { start = new { line, character = ch }, end = new { line, character = endCh } },
            source = "altinn-appconfig",
            code = "REF-DATAMODEL-PATH",
            message = "data-model binding does not match",
        };
        var result = RunSession(
                app.Root,
                ("App/ui/Task_1/layouts/P1.json", layout),
                new
                {
                    jsonrpc = "2.0",
                    id = 2,
                    method = "textDocument/codeAction",
                    @params = new
                    {
                        textDocument = new { uri = p1Uri },
                        range = diag.range,
                        context = new { diagnostics = new[] { diag } },
                    },
                }
            )
            .Single(m => m.TryGetProperty("id", out var i) && i.GetInt32() == 2)
            .GetProperty("result");

        Assert.Equal(1, result.GetArrayLength());
        var action = result[0];
        Assert.Equal("quickfix", action.GetProperty("kind").GetString());
        Assert.Contains("project.address", action.GetProperty("title").GetString());
        var edit = action.GetProperty("edit").GetProperty("changes").EnumerateObject().Single().Value[0];
        Assert.Equal("\"project.address\"", edit.GetProperty("newText").GetString());
    }

    [Fact]
    public void Diagnostics_NonAsciiLine_UseUtf16Columns()
    {
        // The component id contains æøå (3 chars, 6 UTF-8 bytes) BEFORE the flagged binding on
        // the same line, so the engine's byte column and the LSP's UTF-16 column diverge. The
        // published range must be in UTF-16 code units, or the editor highlights the wrong span.
        const string layout =
            "{\"data\":{\"layout\":[{\"id\":\"hus-æøå\",\"type\":\"Input\",\"dataModelBindings\":{\"simpleBinding\":\"nope\"}}]}}";
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/lsp","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}""");
        app.WriteFile("App/ui/Task_1/layouts/P1.json", layout);
        app.WriteFile("App/models/model.schema.json", """{"properties":{"ok":{"type":"string"}}}""");

        var diag = RunSession(app.Root, ("App/ui/Task_1/layouts/P1.json", layout))
            .Where(m => m.TryGetProperty("method", out var me) && me.GetString() == "textDocument/publishDiagnostics")
            .Select(m => m.GetProperty("params"))
            .Single(p => p.GetProperty("uri").GetString() is { } u && u.EndsWith("P1.json", StringComparison.Ordinal))
            .GetProperty("diagnostics")
            .EnumerateArray()
            .Single(d => d.GetProperty("code").GetString() == "REF-DATAMODEL-PATH");

        // Expected = the UTF-16 index of the "nope" token; the BYTE index is 3 higher
        // (æøå is 6 bytes but 3 UTF-16 units), so a byte-as-character bug would over-shoot.
        var (_, utf16Ch, _) = TokenRange(layout, "\"nope\"");
        var byteCol = Encoding.UTF8.GetByteCount(layout[..utf16Ch]);
        Assert.Equal(utf16Ch + 3, byteCol); // sanity: the columns really do diverge here

        var start = diag.GetProperty("range").GetProperty("start");
        Assert.Equal(0, start.GetProperty("line").GetInt32());
        Assert.Equal(utf16Ch, start.GetProperty("character").GetInt32()); // UTF-16, not byteCol
    }

    // A layout file gets a "1 reference" page lens at its head, whose command carries the
    // Settings.json order entry as a location for the client-side references view.
    [Fact]
    public void CodeLens_LayoutFile_OffersPageReferences()
    {
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/lsp","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", SettingsJson);
        app.WriteFile("App/ui/Task_1/layouts/Page1.json", """{"data":{"layout":[]}}""");
        var pageUri = app.Uri("App/ui/Task_1/layouts/Page1.json");

        var lens = RunSession(
                app.Root,
                openDoc: null,
                new
                {
                    jsonrpc = "2.0",
                    id = 2,
                    method = "textDocument/codeLens",
                    @params = new { textDocument = new { uri = pageUri } },
                }
            )
            .Single(m => m.TryGetProperty("id", out var id) && id.GetInt32() == 2)
            .GetProperty("result")
            .EnumerateArray()
            .Single();

        Assert.Equal(0, lens.GetProperty("range").GetProperty("start").GetProperty("line").GetInt32());
        var command = lens.GetProperty("command");
        Assert.Equal("1 reference", command.GetProperty("title").GetString());
        Assert.Equal("altinnAppConfig.showReferences", command.GetProperty("command").GetString());
        var locations = command.GetProperty("arguments")[2].EnumerateArray().ToList();
        Assert.EndsWith("Settings.json", locations.Single().GetProperty("uri").GetString());
    }

    // Diagnostics are pushed only when a file's set actually changed: the first validation (forced
    // by the hover request) publishes Settings.json's finding; the cosmetic edit re-validates on
    // exit but produces an identical set, which is NOT re-sent.
    [Fact]
    public void UnchangedDiagnostics_AreNotRepublished()
    {
        var publishes = RunDiagnosticsSession(SettingsJson + "\n"); // trailing newline: no semantic/position change
        Assert.Equal(1, publishes.Count());
    }

    // A burst of changes validates once (debounced; the synchronous harness flushes on exit), and a
    // real change re-publishes only the changed file — with the diagnostics of the FINAL content.
    [Fact]
    public void ChangedDiagnostics_RepublishOnce_WithTheFinalContent()
    {
        var v2 = SettingsJson.Replace("MissingPage", "OtherMissing");
        var v3 = SettingsJson.Replace("MissingPage", "FinalMissing");
        var publishes = RunDiagnosticsSession(v2, v3);

        Assert.Equal(2, publishes.Count()); // the initial set + ONE update for the two-change burst
        var last = publishes[^1].GetProperty("diagnostics").EnumerateArray().ToList();
        Assert.Contains(last, d => (d.GetProperty("message").GetString() ?? "").Contains("FinalMissing"));
        Assert.DoesNotContain(last, d => (d.GetProperty("message").GetString() ?? "").Contains("OtherMissing"));
    }

    // initialize → didOpen(SettingsJson) → hover (forces validation #1) → one didChange per given
    // text → exit (flushes the debounced validation). Returns the publishDiagnostics params for
    // Settings.json, in order.
    private static List<JsonElement> RunDiagnosticsSession(params string[] changes)
    {
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/lsp","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", SettingsJson);
        app.WriteFile("App/ui/Task_1/layouts/Page1.json", """{"data":{"layout":[]}}""");
        var settingsUri = app.Uri("App/ui/Task_1/Settings.json");

        var frames = new List<object>
        {
            // An engine-reading request flushes the debounced validation → publish #1.
            NavRequest(2, "textDocument/hover", settingsUri, 0, 0),
        };
        var version = 2;
        foreach (var text in changes)
            frames.Add(
                new
                {
                    jsonrpc = "2.0",
                    method = "textDocument/didChange",
                    @params = new
                    {
                        textDocument = new { uri = settingsUri, version = version++ },
                        contentChanges = new[] { new { text } },
                    },
                }
            );

        return RunSession(app.Root, ("App/ui/Task_1/Settings.json", SettingsJson), frames.ToArray())
            .Where(m => m.TryGetProperty("method", out var me) && me.GetString() == "textDocument/publishDiagnostics")
            .Select(m => m.GetProperty("params"))
            .Where(p =>
                p.GetProperty("uri").GetString() is { } u && u.EndsWith("Settings.json", StringComparison.Ordinal)
            )
            .ToList();
    }

    // A malformed body (intact Content-Length framing, non-JSON payload) must not kill the
    // session: the server answers the protocol-level parse error and keeps serving.
    [Fact]
    public void MalformedFrame_AnswersParseError_AndKeepsServing()
    {
        using var app = new TempApp();
        var input = new MemoryStream();
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "initialize",
                @params = new { rootUri = new Uri(app.Root).AbsoluteUri },
            }
        );
        WriteRawFrame(input, "{ this is not json !");
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 2,
                method = "shutdown",
            }
        );
        input.Position = 0;
        var output = new MemoryStream();

        new LspServer(input, output).Run();

        var messages = ParseFrames(output.ToArray());
        var parseError = messages.Single(m => m.TryGetProperty("error", out _));
        Assert.Equal(-32700, parseError.GetProperty("error").GetProperty("code").GetInt32());
        Assert.Equal(JsonValueKind.Null, parseError.GetProperty("id").ValueKind);
        // The frame AFTER the malformed one was still served: the session survived.
        Assert.True(
            messages.Any(m =>
                m.TryGetProperty("id", out var i) && i.ValueKind == JsonValueKind.Number && i.GetInt32() == 2
            ),
            "the frame after the malformed one must still be served"
        );
    }

    // A request whose handler throws must still be ANSWERED (JSON-RPC error response), or the
    // client awaits its promise forever — and the next request must still be served.
    [Fact]
    public void FailingRequest_GetsErrorResponse_AndServerKeepsServing()
    {
        using var app = new TempApp();
        var input = new MemoryStream();
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "initialize",
                @params = new { rootUri = new Uri(app.Root).AbsoluteUri },
            }
        );
        // No `params` at all: the hover handler throws while reading the request.
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 2,
                method = "textDocument/hover",
            }
        );
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 3,
                method = "shutdown",
            }
        );
        input.Position = 0;
        var output = new MemoryStream();

        new LspServer(input, output).Run();

        var messages = ParseFrames(output.ToArray());
        var failed = messages.Single(m =>
            m.TryGetProperty("id", out var i) && i.ValueKind == JsonValueKind.Number && i.GetInt32() == 2
        );
        Assert.Equal(-32603, failed.GetProperty("error").GetProperty("code").GetInt32());
        Assert.True(
            messages.Any(m =>
                m.TryGetProperty("id", out var i) && i.ValueKind == JsonValueKind.Number && i.GetInt32() == 3
            ),
            "the request after the failing one must still be served"
        );
    }

    // An empty contentChanges array means "no change" — it must not wipe the document (a wiped
    // Settings.json would re-validate as a syntax error and re-publish a different set).
    [Fact]
    public void EmptyContentChanges_IsIgnored()
    {
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/lsp","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", SettingsJson);
        app.WriteFile("App/ui/Task_1/layouts/Page1.json", """{"data":{"layout":[]}}""");
        var settingsUri = app.Uri("App/ui/Task_1/Settings.json");

        var publishes = RunSession(
                app.Root,
                ("App/ui/Task_1/Settings.json", SettingsJson),
                NavRequest(2, "textDocument/hover", settingsUri, 0, 0), // flush → publish #1
                new
                {
                    jsonrpc = "2.0",
                    method = "textDocument/didChange",
                    @params = new
                    {
                        textDocument = new { uri = settingsUri, version = 2 },
                        contentChanges = Array.Empty<object>(),
                    },
                }
            )
            .Where(m => m.TryGetProperty("method", out var me) && me.GetString() == "textDocument/publishDiagnostics")
            .Select(m => m.GetProperty("params"))
            .Where(p =>
                p.GetProperty("uri").GetString() is { } u && u.EndsWith("Settings.json", StringComparison.Ordinal)
            )
            .ToList();

        Assert.Equal(1, publishes.Count()); // the no-op change re-published nothing new
        Assert.Contains(
            publishes[0].GetProperty("diagnostics").EnumerateArray(),
            d => d.GetProperty("code").GetString() == "REF-PAGE-FILE"
        );
    }

    // External (disk-level) changes arrive as workspace/didChangeWatchedFiles, with no document
    // events at all — the server must still validate, or published diagnostics go stale.
    [Fact]
    public void DidChangeWatchedFiles_SchedulesValidation()
    {
        using var app = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/lsp","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", SettingsJson);
        app.WriteFile("App/ui/Task_1/layouts/Page1.json", """{"data":{"layout":[]}}""");
        var settingsUri = app.Uri("App/ui/Task_1/Settings.json");

        // exit flushes the scheduled validation
        Assert.Contains(
            RunSession(
                    app.Root,
                    openDoc: null,
                    new
                    {
                        jsonrpc = "2.0",
                        method = "workspace/didChangeWatchedFiles",
                        @params = new { changes = new[] { new { uri = settingsUri, type = 2 } } },
                    }
                )
                .Where(m =>
                    m.TryGetProperty("method", out var me) && me.GetString() == "textDocument/publishDiagnostics"
                )
                .Select(m => m.GetProperty("params")),
            p => (p.GetProperty("uri").GetString() ?? "").EndsWith("Settings.json", StringComparison.Ordinal)
        );
    }

    // Rider sends no usable rootUri at initialize and delivers the real folder afterwards via
    // workspace/didChangeWorkspaceFolders — the server must re-root, replay the already-open
    // buffer, and validate against the new root.
    [Fact]
    public void DidChangeWorkspaceFolders_ReRootsAndValidatesOpenBuffer()
    {
        using var app = new TempApp();
        using var elsewhere = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/lsp","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", """{"pages":{"order":["Page1"]}}""");
        app.WriteFile("App/ui/Task_1/layouts/Page1.json", """{"data":{"layout":[]}}""");
        var settingsUri = app.Uri("App/ui/Task_1/Settings.json");

        var input = new MemoryStream();
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "initialize",
                @params = new { rootUri = new Uri(elsewhere.Root).AbsoluteUri },
            }
        );
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                method = "initialized",
                @params = new { },
            }
        );
        // Opened before the folder change, with buffer content differing from disk.
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                method = "textDocument/didOpen",
                @params = new
                {
                    textDocument = new
                    {
                        uri = settingsUri,
                        languageId = "json",
                        version = 1,
                        text = SettingsJson,
                    },
                },
            }
        );
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                method = "workspace/didChangeWorkspaceFolders",
                @params = new
                {
                    @event = new
                    {
                        added = new[] { new { uri = new Uri(app.Root).AbsoluteUri, name = "app" } },
                        removed = Array.Empty<object>(),
                    },
                },
            }
        );
        input.Position = 0;
        var output = new MemoryStream();

        new LspServer(input, output).Run();

        // The diagnostic comes from the replayed buffer (MissingPage), not the clean disk file.
        var diagnostics = ParseFrames(output.ToArray())
            .Where(m => m.TryGetProperty("method", out var me) && me.GetString() == "textDocument/publishDiagnostics")
            .Select(m => m.GetProperty("params"))
            .Single(p =>
                p.GetProperty("uri").GetString() is { } u && u.EndsWith("Settings.json", StringComparison.Ordinal)
            )
            .GetProperty("diagnostics")
            .EnumerateArray();
        Assert.Contains(diagnostics, d => d.GetProperty("code").GetString() == "REF-PAGE-FILE");
    }

    // Per the LSP spec workspaceFolders wins over rootUri; among folders the first that looks
    // like an app is chosen. The reply must advertise workspace-folder support.
    [Fact]
    public void Initialize_WorkspaceFolders_PicksAppFolder_AndAdvertisesSupport()
    {
        using var app = new TempApp();
        using var elsewhere = new TempApp();
        app.WriteFile(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/lsp","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}"""
        );
        app.WriteFile("App/ui/Task_1/Settings.json", SettingsJson);
        app.WriteFile("App/ui/Task_1/layouts/Page1.json", """{"data":{"layout":[]}}""");
        var settingsUri = app.Uri("App/ui/Task_1/Settings.json");

        var input = new MemoryStream();
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "initialize",
                @params = new
                {
                    workspaceFolders = new[]
                    {
                        new { uri = new Uri(elsewhere.Root).AbsoluteUri, name = "other" },
                        new { uri = new Uri(app.Root).AbsoluteUri, name = "app" },
                    },
                },
            }
        );
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                method = "initialized",
                @params = new { },
            }
        );
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                method = "textDocument/didOpen",
                @params = new
                {
                    textDocument = new
                    {
                        uri = settingsUri,
                        languageId = "json",
                        version = 1,
                        text = SettingsJson,
                    },
                },
            }
        );
        input.Position = 0;
        var output = new MemoryStream();

        new LspServer(input, output).Run();

        var messages = ParseFrames(output.ToArray());
        var init = messages.Single(m => m.TryGetProperty("id", out var id) && id.GetInt32() == 1);
        Assert.True(
            init.GetProperty("result")
                .GetProperty("capabilities")
                .GetProperty("workspace")
                .GetProperty("workspaceFolders")
                .GetProperty("supported")
                .GetBoolean()
        );

        var diagnostics = messages
            .Where(m => m.TryGetProperty("method", out var me) && me.GetString() == "textDocument/publishDiagnostics")
            .Select(m => m.GetProperty("params"))
            .Single(p =>
                p.GetProperty("uri").GetString() is { } u && u.EndsWith("Settings.json", StringComparison.Ordinal)
            )
            .GetProperty("diagnostics")
            .EnumerateArray();
        Assert.Contains(diagnostics, d => d.GetProperty("code").GetString() == "REF-PAGE-FILE");
    }

    // Protocol exit codes: 0 when exit follows shutdown (with late requests rejected as
    // InvalidRequest), 1 when the stream ends without an orderly shutdown.
    [Fact]
    public void ShutdownThenExit_ExitsZero_AndRejectsLateRequests()
    {
        using var app = new TempApp();
        var input = new MemoryStream();
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "initialize",
                @params = new { rootUri = new Uri(app.Root).AbsoluteUri },
            }
        );
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 2,
                method = "shutdown",
            }
        );
        WriteFrame(input, NavRequest(3, "textDocument/hover", new Uri(app.Root).AbsoluteUri, 0, 0));
        WriteFrame(input, new { jsonrpc = "2.0", method = "exit" });
        input.Position = 0;
        var output = new MemoryStream();

        var exitCode = new LspServer(input, output).Run();

        Assert.Equal(0, exitCode);
        var late = ParseFrames(output.ToArray())
            .Single(m => m.TryGetProperty("id", out var i) && i.ValueKind == JsonValueKind.Number && i.GetInt32() == 3);
        Assert.Equal(-32600, late.GetProperty("error").GetProperty("code").GetInt32());
    }

    [Fact]
    public void StreamEndWithoutShutdown_ExitsOne()
    {
        using var app = new TempApp();
        var input = new MemoryStream();
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "initialize",
                @params = new { rootUri = new Uri(app.Root).AbsoluteUri },
            }
        );
        input.Position = 0;

        Assert.Equal(1, new LspServer(input, new MemoryStream()).Run());
    }

    // initialize(root) → initialized → optional didOpen(openDoc) → extraFrames, then runs the
    // server over the whole stream and returns every parsed output frame.
    private static List<JsonElement> RunSession(
        string root,
        (string Rel, string Text)? openDoc,
        params object[] extraFrames
    )
    {
        var input = new MemoryStream();
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "initialize",
                @params = new { rootUri = new Uri(root).AbsoluteUri },
            }
        );
        WriteFrame(
            input,
            new
            {
                jsonrpc = "2.0",
                method = "initialized",
                @params = new { },
            }
        );
        if (openDoc is { } doc)
            WriteFrame(
                input,
                new
                {
                    jsonrpc = "2.0",
                    method = "textDocument/didOpen",
                    @params = new
                    {
                        textDocument = new
                        {
                            uri = new Uri(Path.Combine(root, doc.Rel)).AbsoluteUri,
                            languageId = "json",
                            version = 1,
                            text = doc.Text,
                        },
                    },
                }
            );
        foreach (var frame in extraFrames)
            WriteFrame(input, frame);
        input.Position = 0;
        var output = new MemoryStream();

        new LspServer(input, output).Run();

        return ParseFrames(output.ToArray());
    }

    private static (int Line, int Ch, int EndCh) TokenRange(string text, string quoted)
    {
        var idx = text.IndexOf(quoted, StringComparison.Ordinal);
        var lineStart = text.LastIndexOf('\n', idx) + 1;
        var line = 0;
        for (var i = 0; i < idx; i++)
            if (text[i] == '\n')
                line++;
        return (line, idx - lineStart, idx - lineStart + quoted.Length);
    }

    private static object NavRequest(int id, string method, string uri, int line, int character) =>
        new
        {
            jsonrpc = "2.0",
            id,
            method,
            @params = new { textDocument = new { uri }, position = new { line, character } },
        };

    // 0-based (line, character) just inside the nth occurrence of token.
    private static (int Line, int Char) At0(string text, string token, int nth)
    {
        var idx = -1;
        for (var k = 0; k < nth; k++)
            idx = text.IndexOf(token, idx + 1, StringComparison.Ordinal);
        var inside = idx + 1;
        int line = 0,
            ch = 0;
        for (var p = 0; p < inside; p++)
        {
            if (text[p] == '\n')
            {
                line++;
                ch = 0;
            }
            else
                ch++;
        }
        return (line, ch);
    }

    private static void WriteFrame(Stream stream, object message)
    {
        var body = JsonSerializer.SerializeToUtf8Bytes(message);
        var header = Encoding.ASCII.GetBytes($"Content-Length: {body.Length}\r\n\r\n");
        stream.Write(header);
        stream.Write(body);
    }

    // A correctly framed message whose body is raw (possibly invalid) text.
    private static void WriteRawFrame(Stream stream, string body)
    {
        var bytes = Encoding.UTF8.GetBytes(body);
        var header = Encoding.ASCII.GetBytes($"Content-Length: {bytes.Length}\r\n\r\n");
        stream.Write(header);
        stream.Write(bytes);
    }

    private static List<JsonElement> ParseFrames(byte[] buffer)
    {
        var result = new List<JsonElement>();
        var i = 0;
        while (i < buffer.Length)
        {
            var headerEnd = -1;
            for (var j = i; j + 3 < buffer.Length; j++)
            {
                if (buffer[j] == '\r' && buffer[j + 1] == '\n' && buffer[j + 2] == '\r' && buffer[j + 3] == '\n')
                {
                    headerEnd = j;
                    break;
                }
            }
            if (headerEnd < 0)
                break;

            var header = Encoding.ASCII.GetString(buffer, i, headerEnd - i);
            var length = 0;
            foreach (var line in header.Split("\r\n"))
            {
                if (line.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                    length = int.Parse(line["Content-Length:".Length..].Trim(), CultureInfo.InvariantCulture);
            }
            var bodyStart = headerEnd + 4;
            using var doc = JsonDocument.Parse(buffer.AsMemory(bodyStart, length));
            result.Add(doc.RootElement.Clone());
            i = bodyStart + length;
        }
        return result;
    }

    // A temporary app root on disk; deleted (recursively) on dispose.
    private sealed class TempApp : IDisposable
    {
        public TempApp() => Directory.CreateDirectory(Root);

        public string Root { get; } = Path.Combine(Path.GetTempPath(), "lsp-test-" + Guid.NewGuid().ToString("N"));

        public string Uri(string relativePath) => new Uri(Path.Combine(Root, relativePath)).AbsoluteUri;

        public void WriteFile(string relativePath, string content)
        {
            var path = Path.Combine(Root, relativePath);
            if (Path.GetDirectoryName(path) is { Length: > 0 } dir)
                Directory.CreateDirectory(dir);
            File.WriteAllText(path, content);
        }

        public void Dispose()
        {
            if (Directory.Exists(Root))
                Directory.Delete(Root, recursive: true);
        }
    }
}
