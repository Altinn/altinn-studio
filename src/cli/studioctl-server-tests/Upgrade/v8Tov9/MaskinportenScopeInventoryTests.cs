using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class MaskinportenScopeInventoryTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    private MigrationResult Describe()
    {
        var detector = new MaskinportenSettingsSectionDetector(_app.Root);
        return new MaskinportenScopeInventory(Scanner(), _app.Root, detector.ConfiguredScopes()).Describe();
    }

    /// <summary>The scope rows, without the leading summary and the trailing caveat.</summary>
    private static IReadOnlyList<string> Rows(MigrationResult result) =>
        [.. result.Warnings.Where(static warning => !warning.EndsWith("Scopes found:", StringComparison.Ordinal))];

    [Fact]
    public void NoMaskinportenUsage_ReportsNothing()
    {
        _app.Write("Program.cs", "services.AddControllers();");

        Assert.Empty(Describe().Messages);
    }

    [Fact]
    public void UseMaskinportenAuthorization_ListsEveryScopeLiteral()
    {
        _app.Write(
            "Program.cs",
            """
            services
                .AddHttpClient<MyClient>()
                .UseMaskinportenAuthorization("my:scope.read", "my:scope.write");
            """
        );

        var rows = Rows(Describe());

        Assert.Contains(rows, row => row.StartsWith("my:scope.read - ", StringComparison.Ordinal));
        Assert.Contains(rows, row => row.StartsWith("my:scope.write - ", StringComparison.Ordinal));
        Assert.Contains(rows, row => row.Contains("Program.cs:3", StringComparison.Ordinal));
    }

    [Fact]
    public void UseMaskinportenAltinnAuthorization_IsHarvestedToo()
    {
        _app.Write("Program.cs", """builder.UseMaskinportenAltinnAuthorization("altinn:correspondence.write");""");

        Assert.Contains(
            Rows(Describe()),
            row => row.StartsWith("altinn:correspondence.write - ", StringComparison.Ordinal)
        );
    }

    [Fact]
    public void TokenRequestInitializer_ScopesAreHarvested()
    {
        _app.Write(
            "Program.cs",
            """
            builder.UseMaskinportenAuthorization(
                new MaskinportenTokenRequest { Scopes = ["my:request.scope"] }
            );
            """
        );

        Assert.Contains(Rows(Describe()), row => row.StartsWith("my:request.scope - ", StringComparison.Ordinal));
    }

    [Fact]
    public void TokenRequestInitializer_DoesNotMistakeAMethodArgumentForAScope()
    {
        _app.Write(
            "Program.cs",
            """
            builder.UseMaskinportenAuthorization(
                new MaskinportenTokenRequest { Scopes = LoadScopes("Maskinporten:Scopes") }
            );
            """
        );

        var rows = Rows(Describe());

        Assert.DoesNotContain(rows, row => row.StartsWith("Maskinporten:Scopes - ", StringComparison.Ordinal));
    }

    [Fact]
    public void TokenRequestInitializer_ReadsAnArrayCreationToo()
    {
        _app.Write(
            "Program.cs",
            """
            builder.UseMaskinportenAuthorization(
                new MaskinportenTokenRequest { Scopes = new[] { "my:array.scope" } }
            );
            """
        );

        Assert.Contains(Rows(Describe()), row => row.StartsWith("my:array.scope - ", StringComparison.Ordinal));
    }

    [Fact]
    public void ScopesPassedAsAVariable_StillWarnThatTheyExist()
    {
        _app.Write("Program.cs", "builder.UseMaskinportenAuthorization(scopeFromConfiguration);");

        var result = Describe();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(result.Todos, todo => todo.Contains("written as literals", StringComparison.Ordinal));
        Assert.Contains(result.Todos, todo => todo.Contains("Velg scopes fra Maskinporten", StringComparison.Ordinal));
        Assert.Contains(
            result.Todos,
            todo => todo.Contains("studioctl app maskinporten set", StringComparison.Ordinal)
        );
    }

    [Fact]
    public void ExternalPackageDefaultSection_ScopesAreNotClaimedForTheAppClients()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": {
                "Environment": "test",
                "ClientId": "abc",
                "EncodedJwk": "xyz",
                "Scope": "someone:elses.scope"
              }
            }
            """
        );

        Assert.Empty(Describe().Messages);
    }

    [Fact]
    public void FiksRegistration_InfersTheFiksScope()
    {
        _app.Write("Program.cs", "services.AddFiksArkiv();");

        var rows = Rows(Describe());

        Assert.Contains(rows, row => row.StartsWith("ks:fiks - ", StringComparison.Ordinal));
        Assert.Contains(rows, row => row.Contains("AddFiksArkiv", StringComparison.Ordinal));
    }

    [Fact]
    public void FiksServiceTask_InfersTheFiksScopeWithoutAnyCSharp()
    {
        _app.Write(
            "config/process/process.bpmn",
            """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                              xmlns:altinn="http://altinn.no/process">
              <bpmn:process id="p">
                <bpmn:serviceTask id="Task_Archive">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>fiksArkiv</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:serviceTask>
              </bpmn:process>
            </bpmn:definitions>
            """
        );

        var rows = Rows(Describe());

        Assert.Contains(rows, row => row.StartsWith("ks:fiks - ", StringComparison.Ordinal));
        Assert.Contains(rows, row => row.Contains("process.bpmn", StringComparison.Ordinal));
    }

    [Fact]
    public void CorrespondenceClient_InfersTheCorrespondenceScope()
    {
        _app.Write(
            "logic/Sender.cs",
            """
            public class Sender
            {
                private readonly ICorrespondenceClient _client;
            }
            """
        );

        Assert.Contains(
            Rows(Describe()),
            row => row.StartsWith("altinn:correspondence.write - ", StringComparison.Ordinal)
        );
    }

    [Fact]
    public void ServiceOwnerScopes_AreNeverReported()
    {
        _app.Write(
            "Program.cs",
            """
            builder.UseMaskinportenAuthorization(
                "altinn:serviceowner",
                "altinn:serviceowner/instances.read",
                "altinn:serviceowner/instances.write",
                "my:real.scope"
            );
            """
        );

        var rows = Rows(Describe());

        Assert.Contains(rows, row => row.StartsWith("my:real.scope - ", StringComparison.Ordinal));
        Assert.DoesNotContain(rows, row => row.StartsWith("altinn:serviceowner", StringComparison.Ordinal));
    }

    [Fact]
    public void ScopeNamedLikeServiceOwnerButDistinct_IsStillReported()
    {
        _app.Write("Program.cs", """builder.UseMaskinportenAuthorization("altinn:serviceownerships.read");""");

        Assert.Contains(
            Rows(Describe()),
            row => row.StartsWith("altinn:serviceownerships.read - ", StringComparison.Ordinal)
        );
    }

    [Fact]
    public void ConfiguredScope_IsEchoedBeforeTheSectionIsDeleted()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MyApp--MaskinportenSettings": {
                "clientId": "abc",
                "jwkBase64": "xyz",
                "Scope": "ks:fiks my:legacy.scope"
              }
            }
            """
        );

        var rows = Rows(Describe());

        Assert.Contains(rows, row => row.StartsWith("ks:fiks - ", StringComparison.Ordinal));
        Assert.Contains(rows, row => row.StartsWith("my:legacy.scope - ", StringComparison.Ordinal));
        Assert.Contains(rows, row => row.Contains("appsettings.json", StringComparison.Ordinal));
    }

    [Fact]
    public void ScopeKeyOutsideAMaskinportenSection_IsNotClaimed()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "SomeOtherApi": { "Scope": "not-a-maskinporten-scope" }
            }
            """
        );

        Assert.Empty(Describe().Messages);
    }

    [Fact]
    public void AnyFinding_CarriesBothClientsAndTheIncompletenessCaveat()
    {
        _app.Write("Program.cs", """builder.UseMaskinportenAuthorization("my:scope");""");

        var warnings = Describe().Warnings;

        Assert.Contains(warnings, w => w.Contains("two Maskinporten clients", StringComparison.Ordinal));
        Assert.Contains(warnings, w => w.Contains("studioctl app maskinporten set", StringComparison.Ordinal));
        Assert.Contains(warnings, w => w.Contains("Velg scopes fra Maskinporten", StringComparison.Ordinal));
        Assert.Contains(warnings, w => w.Contains("is not listed", StringComparison.Ordinal));
    }

    [Fact]
    public void SameScopeFromTwoSources_IsOneRowWithBothEvidences()
    {
        _app.Write("Program.cs", "services.AddFiksArkiv();");
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": { "clientId": "abc", "jwkBase64": "xyz", "Scope": "ks:fiks" }
            }
            """
        );

        var fiksRows = Rows(Describe()).Where(row => row.StartsWith("ks:fiks - ", StringComparison.Ordinal)).ToList();

        var row = Assert.Single(fiksRows);
        Assert.Contains("AddFiksArkiv", row, StringComparison.Ordinal);
        Assert.Contains("appsettings.json", row, StringComparison.Ordinal);
    }
}
