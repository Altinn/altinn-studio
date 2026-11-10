using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers dropping the Async suffix from app code using the SDK methods v9 renamed: with a compilation,
/// exactly the tokens that bind to (or implement) an SDK method are renamed and .NET methods of the same
/// name are kept; without one, only implementations of SDK interfaces are renamed and the rest is listed.
/// Semantic cases migrate against a v8 stub and then compile against a v9 stub.
/// </summary>
public sealed class AsyncSuffixApiMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public AsyncSuffixApiMigrationTests()
    {
        // The implicit usings an app project gets, which the stub compilation does not add on its own.
        _app.Write(
            "GlobalUsings.cs",
            """
            global using System;
            global using System.Collections.Generic;
            global using System.Net.Http;
            global using System.Threading.Tasks;
            """
        );
    }

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private CSharpSourceScanner SyntaxScanner() => new(AppFolder);

    private const string CommonStubSource = """
        namespace Altinn.App.Core.Models
        {
            public sealed class AppOptions { }
        }

        namespace Altinn.App.Core.Helpers
        {
            public enum RowRemovalOption { DeleteRow, SetToNull }
        }

        namespace Altinn.App.Core.Internal.Expressions
        {
            public sealed class LayoutEvaluatorState { }
        }
        """;

    /// <summary>The v8 shapes of the renamed SDK surface.</summary>
    private static readonly Lazy<MetadataReference> _v8Stub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            CommonStubSource
                + """

                namespace Altinn.App.Core.Features
                {
                    public interface IAppOptionsProvider
                    {
                        string Id { get; }
                        System.Threading.Tasks.Task<Altinn.App.Core.Models.AppOptions> GetAppOptionsAsync(
                            string? language, System.Collections.Generic.Dictionary<string, string> keyValuePairs);
                    }

                    public interface IProcessExclusiveGateway
                    {
                        string GatewayId { get; }
                        System.Threading.Tasks.Task<System.Collections.Generic.List<string>> FilterAsync(
                            System.Collections.Generic.List<string> outgoingFlows);
                    }
                }

                namespace Altinn.App.Core.Helpers
                {
                    public static class JsonSerializerPermissive
                    {
                        public static System.Threading.Tasks.Task<T> DeserializeAsync<T>(System.Net.Http.HttpContent content) => null!;
                    }
                }

                namespace Altinn.App.Core.Internal.Secrets
                {
                    public interface ISecretsClient
                    {
                        System.Threading.Tasks.Task<string> GetSecretAsync(string secretName);
                    }
                }

                namespace Altinn.App.Core.Internal.Expressions
                {
                    public static class LayoutEvaluator
                    {
                        public static void RemoveHiddenData(LayoutEvaluatorState state, Altinn.App.Core.Helpers.RowRemovalOption option) { }
                        public static System.Threading.Tasks.Task RemoveHiddenDataAsync(
                            LayoutEvaluatorState state, Altinn.App.Core.Helpers.RowRemovalOption option) => null!;
                        public static System.Threading.Tasks.Task RemoveHiddenDataAsync(
                            LayoutEvaluatorState state, Altinn.App.Core.Helpers.RowRemovalOption option, bool evaluateRemoveWhenHidden) => null!;
                    }
                }
                """
        )
    );

    /// <summary>The same surface as v9 ships it: no Async suffix, no two-parameter RemoveHiddenData.</summary>
    private static readonly Lazy<MetadataReference> _v9Stub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            CommonStubSource
                + """

                namespace Altinn.App.Core.Features
                {
                    public interface IAppOptionsProvider
                    {
                        string Id { get; }
                        System.Threading.Tasks.Task<Altinn.App.Core.Models.AppOptions> GetAppOptions(
                            string? language, System.Collections.Generic.Dictionary<string, string> keyValuePairs);
                    }

                    public interface IProcessExclusiveGateway
                    {
                        string GatewayId { get; }
                        System.Threading.Tasks.Task<System.Collections.Generic.List<string>> Filter(
                            System.Collections.Generic.List<string> outgoingFlows);
                    }
                }

                namespace Altinn.App.Core.Helpers
                {
                    public static class JsonSerializerPermissive
                    {
                        public static System.Threading.Tasks.Task<T> Deserialize<T>(System.Net.Http.HttpContent content) => null!;
                    }
                }

                namespace Altinn.App.Core.Internal.Secrets
                {
                    public interface ISecretsClient
                    {
                        System.Threading.Tasks.Task<string> GetSecret(string secretName);
                    }
                }

                namespace Altinn.App.Core.Internal.Expressions
                {
                    public static class LayoutEvaluator
                    {
                        public static System.Threading.Tasks.Task RemoveHiddenData(
                            LayoutEvaluatorState state, Altinn.App.Core.Helpers.RowRemovalOption option, bool evaluateRemoveWhenHidden) => null!;
                    }
                }
                """
        )
    );

    private CSharpSourceScanner SemanticScanner() => SemanticScannerFactory.CreateScanner(AppFolder, _v8Stub.Value);

    private void AssertCompilesAgainstV9() =>
        Assert.Empty(SemanticScannerFactory.CompileErrors(AppFolder, _v9Stub.Value));

    // --- With a compilation: exactly the SDK bindings ----------------------------------------------

    [Fact]
    public void WithSemantics_SdkCallsRenamed_FrameworkCallsKept()
    {
        var client = _app.Write(
            "logic/PlatformClient.cs",
            """
            using System.Net.Http.Json;
            using System.Text.Json;
            using Altinn.App.Core.Helpers;
            using Altinn.App.Core.Internal.Secrets;

            public class PlatformClient(HttpClient httpClient, ISecretsClient secrets)
            {
                public async Task<string> Run()
                {
                    using var response = await httpClient.GetAsync("https://example.com");
                    var permissive = await JsonSerializerPermissive.DeserializeAsync<string>(response.Content);
                    var strict = await JsonSerializer.DeserializeAsync<string>(await response.Content.ReadAsStreamAsync());
                    var json = await response.Content.ReadFromJsonAsync<string>();
                    var secret = await secrets.GetSecretAsync("apikey");
                    return permissive + strict + json + secret;
                }
            }
            """
        );

        var result = new AsyncSuffixApiMigration(SemanticScanner()).Migrate();

        var migrated = File.ReadAllText(client);
        Assert.Contains("JsonSerializerPermissive.Deserialize<string>(", migrated);
        Assert.Contains("secrets.GetSecret(\"apikey\")", migrated);
        Assert.Contains("httpClient.GetAsync(\"https://example.com\")", migrated);
        Assert.Contains("JsonSerializer.DeserializeAsync<string>(", migrated);
        Assert.Contains("ReadAsStreamAsync()", migrated);
        Assert.Contains("ReadFromJsonAsync<string>()", migrated);
        // With a semantic verdict on every occurrence, nothing is left for manual review.
        Assert.DoesNotContain(
            result.Warnings,
            w => w.StartsWith("These occurrences could not be verified", StringComparison.Ordinal)
        );
        AssertCompilesAgainstV9();
    }

    [Fact]
    public void WithSemantics_ImplementationAndConcreteCallSitesRenamed_AppOwnMethodsKept()
    {
        var gateway = _app.Write(
            "logic/RouteGateway.cs",
            """
            using Altinn.App.Core.Features;

            public class RouteGateway : IProcessExclusiveGateway
            {
                public string GatewayId => "Gateway_1";

                public Task<List<string>> FilterAsync(List<string> outgoingFlows) => Task.FromResult(outgoingFlows);
            }

            public class Unrelated
            {
                public Task<int> FilterAsync(int value) => Task.FromResult(value);
                public Task<int> Use() => FilterAsync(1);
            }
            """
        );
        var caller = _app.Write(
            "logic/GatewayCaller.cs",
            """
            public class GatewayCaller
            {
                public Task<List<string>> Run(RouteGateway gateway) => gateway.FilterAsync([]);
            }
            """
        );

        new AsyncSuffixApiMigration(SemanticScanner()).Migrate();

        var migratedGateway = File.ReadAllText(gateway);
        Assert.Contains("public Task<List<string>> Filter(List<string> outgoingFlows)", migratedGateway);
        // An app's own method that merely shares the name keeps it: it implements no SDK contract.
        Assert.Contains("public Task<int> FilterAsync(int value)", migratedGateway);
        Assert.Contains("=> FilterAsync(1)", migratedGateway);
        Assert.Contains("gateway.Filter([])", File.ReadAllText(caller));
        AssertCompilesAgainstV9();
    }

    [Fact]
    public void WithSemantics_CallSiteInAFileProcessedAfterTheImplementation_StillRenamed()
    {
        // Pin the order that used to lose the call: the implementation's file is rewritten first.
        _app.Write("logic/First.cs", "");
        _app.Write("logic/Second.cs", "");
        var order = SyntaxScanner().Files.Select(file => file.Path).Where(path => path.Contains("logic")).ToList();
        var implementation = order[0];
        var caller = order[1];
        File.WriteAllText(
            implementation,
            """
            using Altinn.App.Core.Features;

            public class RouteGateway : IProcessExclusiveGateway
            {
                public string GatewayId => "Gateway_1";

                public Task<List<string>> FilterAsync(List<string> outgoingFlows) => Task.FromResult(outgoingFlows);
            }
            """
        );
        File.WriteAllText(
            caller,
            """
            public class GatewayCaller
            {
                public Task<List<string>> Run(RouteGateway gateway) => gateway.FilterAsync([]);
            }
            """
        );

        new AsyncSuffixApiMigration(SemanticScanner()).Migrate();

        Assert.Contains("gateway.Filter([])", File.ReadAllText(caller));
        AssertCompilesAgainstV9();
    }

    [Fact]
    public void WithSemantics_ExplicitImplementationAndNameofRenamed()
    {
        var provider = _app.Write(
            "options/CountryOptions.cs",
            """
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Models;

            public class CountryOptions : IAppOptionsProvider
            {
                public string Id => nameof(IAppOptionsProvider.GetAppOptionsAsync);

                Task<AppOptions> IAppOptionsProvider.GetAppOptionsAsync(
                    string? language,
                    Dictionary<string, string> keyValuePairs
                ) => Task.FromResult(new AppOptions());
            }
            """
        );

        new AsyncSuffixApiMigration(SemanticScanner()).Migrate();

        var migrated = File.ReadAllText(provider);
        Assert.Contains("nameof(IAppOptionsProvider.GetAppOptions)", migrated);
        Assert.Contains("Task<AppOptions> IAppOptionsProvider.GetAppOptions(", migrated);
        AssertCompilesAgainstV9();
    }

    [Fact]
    public void Rerun_FindsNothingLeftToDo()
    {
        _app.Write(
            "logic/RouteGateway.cs",
            """
            using Altinn.App.Core.Features;

            public class RouteGateway : IProcessExclusiveGateway
            {
                public string GatewayId => "Gateway_1";

                public Task<List<string>> FilterAsync(List<string> outgoingFlows) => Task.FromResult(outgoingFlows);
            }
            """
        );
        new AsyncSuffixApiMigration(SemanticScanner()).Migrate();

        // A resumed upgrade scans without a compilation.
        var rerun = new AsyncSuffixApiMigration(SyntaxScanner()).Migrate();

        Assert.Empty(rerun.Messages);
    }

    // --- Without a compilation: only implementations of SDK interfaces -----------------------------

    [Fact]
    public void WithoutSemantics_InterfaceImplementationsRenamedByBaseList()
    {
        var code = _app.Write(
            "logic/Providers.cs",
            """
            public class CountryOptions : IAppOptionsProvider
            {
                public string Id => "countries";

                public Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs) =>
                    Task.FromResult(new AppOptions());
            }

            public class RouteGateway : Altinn.App.Core.Features.IProcessExclusiveGateway
            {
                public string GatewayId => "Gateway_1";

                public Task<List<string>> FilterAsync(List<string> outgoingFlows) => Task.FromResult(outgoingFlows);
            }

            public class Unrelated
            {
                public Task<int> FilterAsync(int value) => Task.FromResult(value);
            }
            """
        );

        var result = new AsyncSuffixApiMigration(SyntaxScanner()).Migrate();

        Assert.False(result.RequiresManualFollowUp);
        var migrated = File.ReadAllText(code);
        Assert.Contains("public Task<AppOptions> GetAppOptions(string? language", migrated);
        Assert.Contains("public Task<List<string>> Filter(List<string> outgoingFlows)", migrated);
        Assert.Contains("public Task<int> FilterAsync(int value)", migrated);
    }

    [Fact]
    public void WithoutSemantics_ExplicitInterfaceImplementationRenamed()
    {
        var provider = _app.Write(
            "options/CountryOptions.cs",
            """
            public class CountryOptions : IAppOptionsProvider
            {
                public string Id => "countries";

                Task<AppOptions> IAppOptionsProvider.GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs) =>
                    Task.FromResult(new AppOptions());
            }
            """
        );

        new AsyncSuffixApiMigration(SyntaxScanner()).Migrate();

        Assert.Contains(
            "Task<AppOptions> IAppOptionsProvider.GetAppOptions(string? language",
            File.ReadAllText(provider)
        );
    }

    [Fact]
    public void WithoutSemantics_OtherOccurrencesListedOnlyWhereTheSdkTypeIsReferenced_NeverRewritten()
    {
        var sdkUser = _app.Write(
            "logic/SecretUser.cs",
            """
            public class SecretUser(ISecretsClient secrets, CountryOptions options)
            {
                public Task<string> Secret() => secrets.GetSecretAsync("apikey");
                public Task<AppOptions> Options() => options.GetAppOptionsAsync(null, new());
            }
            """
        );
        var libraryUser = _app.Write(
            "logic/KeyVaultUser.cs",
            """
            public class KeyVaultUser(SecretClient client)
            {
                public Task<string> Secret() => client.GetSecretAsync("apikey");
            }
            """
        );

        var result = new AsyncSuffixApiMigration(SyntaxScanner()).Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.DoesNotContain(result.Warnings, w => w.StartsWith("Removed the Async suffix", StringComparison.Ordinal));
        Assert.Contains("secrets.GetSecretAsync(\"apikey\")", File.ReadAllText(sdkUser));
        Assert.Contains("options.GetAppOptionsAsync(null, new())", File.ReadAllText(sdkUser));
        Assert.Contains("client.GetSecretAsync(\"apikey\")", File.ReadAllText(libraryUser));
        Assert.Contains(result.Warnings, w => w.Contains("SecretUser.cs:3") && w.Contains("GetSecretAsync"));
        // The call through the app's own type names no SDK type, and the Key Vault client is not the SDK.
        Assert.DoesNotContain(result.Warnings, w => w.Contains("SecretUser.cs:4"));
        Assert.DoesNotContain(result.Warnings, w => w.Contains("KeyVaultUser.cs"));
    }

    // --- LayoutEvaluator's removed overloads ------------------------------------------------------

    [Fact]
    public void RemoveHiddenData_TwoArgumentCallsKeepTheirBehavior_SyncCallsReported()
    {
        var processor = _app.Write(
            "logic/HiddenData.cs",
            """
            using Altinn.App.Core.Helpers;
            using Altinn.App.Core.Internal.Expressions;

            public class HiddenData
            {
                public async Task Clean(LayoutEvaluatorState state)
                {
                    await LayoutEvaluator.RemoveHiddenDataAsync(state, RowRemovalOption.SetToNull);
                    await LayoutEvaluator.RemoveHiddenDataAsync(state, RowRemovalOption.DeleteRow, evaluateRemoveWhenHidden: true);
                    await LayoutEvaluator.RemoveHiddenDataAsync(
                        state,
                        RowRemovalOption.DeleteRow
                    );
                }

                public void CleanSync(LayoutEvaluatorState state) =>
                    LayoutEvaluator.RemoveHiddenData(state, RowRemovalOption.SetToNull);
            }
            """
        );

        var result = new AsyncSuffixApiMigration(SemanticScanner()).Migrate();

        var migrated = File.ReadAllText(processor).ReplaceLineEndings("\n");
        Assert.Contains(
            "LayoutEvaluator.RemoveHiddenData(state, RowRemovalOption.SetToNull, evaluateRemoveWhenHidden: false);",
            migrated
        );
        Assert.Contains(
            "LayoutEvaluator.RemoveHiddenData(state, RowRemovalOption.DeleteRow, evaluateRemoveWhenHidden: true);",
            migrated
        );
        // A one-argument-per-line call keeps that shape.
        Assert.Contains(
            """
                    await LayoutEvaluator.RemoveHiddenData(
                        state,
                        RowRemovalOption.DeleteRow,
                        evaluateRemoveWhenHidden: false
                    );
            """,
            migrated
        );
        Assert.DoesNotContain("RemoveHiddenDataAsync", migrated);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("HiddenData.cs:17", todo);
    }

    [Fact]
    public void RemoveHiddenData_WithoutSemantics_ListedNotRewritten_SyncCallReported()
    {
        var processor = _app.Write(
            "logic/HiddenData.cs",
            """
            public class HiddenData
            {
                public Task Clean(object state, object option) =>
                    LayoutEvaluator.RemoveHiddenDataAsync(state, option);

                public void CleanSync(object state, object option) =>
                    Altinn.App.Core.Internal.Expressions.LayoutEvaluator.RemoveHiddenData(state, option);

                public void Own(object state, object option) => RemoveHiddenData(state, option);

                private static void RemoveHiddenData(object state, object option) { }
            }
            """
        );

        var result = new AsyncSuffixApiMigration(SyntaxScanner()).Migrate();

        Assert.Contains("LayoutEvaluator.RemoveHiddenDataAsync(state, option);", File.ReadAllText(processor));
        Assert.Contains(
            result.Warnings,
            w => w.Contains("HiddenData.cs:4: RemoveHiddenDataAsync (also pass evaluateRemoveWhenHidden: false)")
        );
        var todo = Assert.Single(result.Todos);
        Assert.Contains("HiddenData.cs:7", todo);
    }

    [Fact]
    public void RemoveHiddenData_WithoutSemantics_UsingStaticSyncCallReported()
    {
        _app.Write(
            "logic/HiddenData.cs",
            """
            using static Altinn.App.Core.Internal.Expressions.LayoutEvaluator;

            public class HiddenData
            {
                public void CleanSync(object state, object option) => RemoveHiddenData(state, option);
            }
            """
        );

        var result = new AsyncSuffixApiMigration(SyntaxScanner()).Migrate();

        var todo = Assert.Single(result.Todos);
        Assert.Contains("HiddenData.cs:5", todo);
    }

    // --- String literals are never touched --------------------------------------------------------

    [Fact]
    public void StringLiterals_KeepTheirSpelling()
    {
        var tracing = _app.Write(
            "logic/Tracing.cs",
            """
            public class Tracing : IAppOptionsProvider
            {
                public string Name => "IAppOptionsProvider.GetAppOptionsAsync";
            }
            """
        );

        new AsyncSuffixApiMigration(SyntaxScanner()).Migrate();

        Assert.Contains("\"IAppOptionsProvider.GetAppOptionsAsync\"", File.ReadAllText(tracing));
    }
}
