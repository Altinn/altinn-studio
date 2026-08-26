using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class PlatformHttpExceptionApiMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    /// <summary>
    /// The reported <c>path:line: symbol</c> lines only, excluding the leading guidance summary — the
    /// summary names the surviving APIs, so a negative assertion over the whole warning set would match it.
    /// </summary>
    private static IEnumerable<string> Locations(MigrationResult result) =>
        result.Warnings.Where(static w => w.Contains(".cs:", StringComparison.Ordinal));

    private string Migrate(string relativePath, string source)
    {
        _app.Write(relativePath, source);
        new PlatformHttpExceptionApiMigration(Scanner()).Migrate();
        return _app.Read(relativePath);
    }

    // --- PlatformHttpExceptionApiMigration (auto-rewrite) ----------------------------------------

    [Fact]
    public void Migration_RenamesCreateAsyncToCreate()
    {
        var migrated = Migrate(
            "logic/StorageClient.cs",
            """
            using Altinn.App.Core.Helpers;
            public class StorageClient
            {
                private static async Task EnsureSuccessStatusCode(HttpResponseMessage response)
                {
                    if (response.IsSuccessStatusCode) return;
                    throw await PlatformHttpException.CreateAsync(response);
                }
            }
            """
        );

        Assert.Contains("PlatformHttpException.Create(response)", migrated);
        Assert.DoesNotContain("CreateAsync", migrated);
    }

    [Fact]
    public void Migration_LeavesUnrelatedCreateAsyncAlone()
    {
        var migrated = Migrate(
            "logic/Other.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Other
            {
                public Task Run(PlatformHttpException ex) => SomethingElse.CreateAsync(ex);
            }
            """
        );

        Assert.Contains("SomethingElse.CreateAsync(ex)", migrated);
    }

    /// <summary>
    /// Without a semantic model the argument's type is unknowable, and there is no public API that turns
    /// an arbitrary HttpResponseMessage into a snapshot — so this is reported rather than guessed at.
    /// </summary>
    [Fact]
    public void Migration_ReportsConstructorCallsItCannotType()
    {
        _app.Write(
            "logic/Client.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Client
            {
                public PlatformHttpException Fail(HttpResponseMessage response, string content) =>
                    new PlatformHttpException(response, content);
            }
            """
        );

        var result = new PlatformHttpExceptionApiMigration(Scanner()).Migrate();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(Locations(result), w => w.Contains("Client.cs") && w.Contains("could not"));
        // Left untouched rather than rewritten into something that will not compile.
        Assert.Contains("new PlatformHttpException(response, content)", _app.Read("logic/Client.cs"));
    }

    /// <summary>
    /// The one constructor call site found across the 5605 app repos on altinn.studio is written this
    /// way. A textual search for <c>new PlatformHttpException(</c> does not find it at all.
    /// </summary>
    [Fact]
    public void Migration_RewritesTargetTypedNewViaTheDeclaredReturnType()
    {
        var migrated = Migrate(
            "ApiTest/SubAppServiceTests.cs",
            """
            using Altinn.App.Core.Helpers;
            public class SubAppServiceTests
            {
                private static PlatformHttpException PlatformError(HttpStatusCode statusCode) =>
                    new(new HttpResponseMessage(statusCode), $"Platform returned {statusCode}");
            }
            """
        );

        Assert.Contains("new(statusCode, $\"Platform returned {statusCode}\")", migrated);
        Assert.DoesNotContain("HttpResponseMessage", migrated);
    }

    [Fact]
    public void Migration_BuildsSnapshotDirectlyForConstructedResponses()
    {
        var migrated = Migrate(
            "logic/Fake.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Fake
            {
                public PlatformHttpException NotFound() =>
                    new PlatformHttpException(new HttpResponseMessage(HttpStatusCode.NotFound), "gone");
            }
            """
        );

        Assert.Contains("new PlatformHttpException(HttpStatusCode.NotFound, \"gone\")", migrated);
    }

    [Fact]
    public void Migration_WrapsTheNamedResponseArgumentRegardlessOfPosition()
    {
        var migrated = Migrate(
            "logic/Named.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Named
            {
                public PlatformHttpException Fail(string body) =>
                    new PlatformHttpException(message: body, response: new HttpResponseMessage(HttpStatusCode.Gone));
            }
            """
        );

        Assert.Contains("new PlatformHttpException(message: body, statusCode: HttpStatusCode.Gone)", migrated);
        Assert.DoesNotContain("response:", migrated);
    }

    [Fact]
    public void Migration_LeavesNamedCallsWithoutAResponseArgumentAlone()
    {
        var source = """
            using Altinn.App.Core.Helpers;
            public class Named
            {
                public PlatformHttpException Fail(PlatformHttpResponse snapshot, string body) =>
                    new PlatformHttpException(message: body, snapshot: snapshot);
            }
            """;

        var migrated = Migrate("logic/Named.cs", source);

        // Better to leave a call we cannot classify than to emit a rewrite that will not compile.
        Assert.Equal(source, migrated);
    }

    [Fact]
    public void Migration_IsIdempotent()
    {
        _app.Write(
            "logic/Client.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Client
            {
                public PlatformHttpException Fail() =>
                    new PlatformHttpException(new HttpResponseMessage(HttpStatusCode.NotFound), "boom");
            }
            """
        );

        new PlatformHttpExceptionApiMigration(Scanner()).Migrate();
        var afterFirst = _app.Read("logic/Client.cs");

        // A second pass must not rewrite the already-migrated argument again.
        var second = new PlatformHttpExceptionApiMigration(Scanner()).Migrate();
        var afterSecond = _app.Read("logic/Client.cs");

        Assert.Equal(afterFirst, afterSecond);
        Assert.Empty(second.Warnings);
    }

    [Fact]
    public void Migration_RewritesFullyQualifiedConstructorCalls()
    {
        var migrated = Migrate(
            "logic/Qualified.cs",
            """
            public class Qualified
            {
                public Altinn.App.Core.Helpers.PlatformHttpException Fail() =>
                    new Altinn.App.Core.Helpers.PlatformHttpException(
                        new HttpResponseMessage(HttpStatusCode.NotFound), "boom");
            }
            """
        );

        Assert.Contains("HttpStatusCode.NotFound, \"boom\"", migrated);
        Assert.DoesNotContain("HttpResponseMessage", migrated);
    }

    [Fact]
    public void Migration_LeavesStatusCodeReadsAlone()
    {
        var source = """
            using Altinn.App.Core.Helpers;
            public class Handler
            {
                public int Handle(PlatformHttpException ex) => (int)ex.Response.StatusCode;
            }
            """;

        var migrated = Migrate("logic/Handler.cs", source);

        Assert.Equal(source, migrated);
    }

    /// <summary>
    /// A v8 call can target-type the throwaway response: the outer constructor gives the inner
    /// <c>new(..)</c> its <c>HttpResponseMessage</c> type.
    /// </summary>
    [Fact]
    public void Migration_UnwrapsTargetTypedThrowawayResponses()
    {
        var migrated = Migrate(
            "logic/Implicit.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Implicit
            {
                public PlatformHttpException Fail() =>
                    new PlatformHttpException(new(HttpStatusCode.NotFound), "gone");
            }
            """
        );

        Assert.Contains("new PlatformHttpException(HttpStatusCode.NotFound, \"gone\")", migrated);
    }

    /// <summary>
    /// Re-running the upgrade must not report an already-migrated call. The status code here is a bare
    /// identifier, so this only works if the type is resolved from the enclosing member rather than
    /// guessed from tokens in the expression.
    /// </summary>
    [Fact]
    public void Migration_LeavesAMigratedStatusCodeIdentifierAlone()
    {
        _app.Write(
            "logic/Helper.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Helper
            {
                public static PlatformHttpException Error(HttpStatusCode statusCode) =>
                    new PlatformHttpException(statusCode, "already migrated");
            }
            """
        );

        var result = new PlatformHttpExceptionApiMigration(Scanner()).Migrate();

        Assert.Empty(result.Todos);
        Assert.Empty(Locations(result));
    }

    /// <summary>
    /// The inverse trap: a helper that returns a response but mentions HttpStatusCode must not be
    /// mistaken for already-migrated code.
    /// </summary>
    [Fact]
    public void Migration_ReportsAResponseHelperThatMentionsAStatusCode()
    {
        _app.Write(
            "logic/Builder.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Builder
            {
                public PlatformHttpException Fail()
                {
                    HttpResponseMessage response = BuildResponse(HttpStatusCode.NotFound);
                    return new PlatformHttpException(response, "gone");
                }
            }
            """
        );

        var result = new PlatformHttpExceptionApiMigration(Scanner()).Migrate();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(Locations(result), w => w.Contains("Builder.cs") && w.Contains("could not"));
    }

    [Fact]
    public void Migration_ReportsAThrowawayResponseWithNoStatusToUnwrap()
    {
        _app.Write(
            "logic/Bare.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Bare
            {
                public PlatformHttpException Fail() =>
                    new PlatformHttpException(new HttpResponseMessage(), "boom");
            }
            """
        );

        var result = new PlatformHttpExceptionApiMigration(Scanner()).Migrate();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(Locations(result), w => w.Contains("Bare.cs"));
    }

    // --- PlatformHttpExceptionApiDetector (warn-only) --------------------------------------------

    /// <summary>
    /// The silent-failure case: this keeps compiling in v9 and starts returning the fallback status at
    /// runtime, so nothing but this warning will tell the app author.
    /// </summary>
    [Fact]
    public void Detector_FlagsReflectionOverTheResponseProperty()
    {
        _app.Write(
            "Extensions/PlatformHttpExceptionExtensions.cs",
            """
            using System.Reflection;
            using Altinn.App.Core.Helpers;
            public static class PlatformHttpExceptionExtensions
            {
                private static HttpStatusCode GetStatusCode(PlatformHttpException ex)
                {
                    var responseProp = ex.GetType().GetProperty("Response", BindingFlags.Public | BindingFlags.Instance);
                    var responseValue = responseProp?.GetValue(ex) as System.Net.Http.HttpResponseMessage;
                    if (responseValue != null) { return responseValue.StatusCode; }
                    return HttpStatusCode.InternalServerError;
                }
            }
            """
        );

        var result = new PlatformHttpExceptionApiDetector(Scanner()).Detect();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(Locations(result), w => w.Contains("GetProperty(\"Response\")"));
        Assert.Contains(Locations(result), w => w.Contains("cast to HttpResponseMessage"));
    }

    [Fact]
    public void Detector_FlagsContentAndHeaderAccess()
    {
        _app.Write(
            "logic/Handler.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Handler
            {
                public async Task<string> Body(PlatformHttpException ex) => await ex.Response.Content.ReadAsStringAsync();
                public object Headers(PlatformHttpException ex) => ex.Response.Headers;
            }
            """
        );

        var result = new PlatformHttpExceptionApiDetector(Scanner()).Detect();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(Locations(result), w => w.Contains("Response.Content"));
        Assert.Contains(Locations(result), w => w.Contains("Response.Headers"));
    }

    [Fact]
    public void Detector_FlagsBareResponseUsedAsAValue()
    {
        _app.Write(
            "logic/Handler.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Handler
            {
                public void Log(PlatformHttpException ex) => Sink.Accept(ex.Response);
            }
            """
        );

        var result = new PlatformHttpExceptionApiDetector(Scanner()).Detect();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(Locations(result), w => w.EndsWith("Response", StringComparison.Ordinal));
    }

    [Fact]
    public void Detector_IgnoresStatusCodeReads()
    {
        _app.Write(
            "logic/Handler.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Handler
            {
                public IActionResult Handle(PlatformHttpException ex) => ex.Response.StatusCode switch
                {
                    HttpStatusCode.NotFound => NotFound(),
                    _ => StatusCode((int)ex.Response.StatusCode),
                };
            }
            """
        );

        var result = new PlatformHttpExceptionApiDetector(Scanner()).Detect();

        Assert.Empty(result.Todos);
        Assert.Empty(Locations(result));
    }

    /// <summary>
    /// <c>HttpContext.Response</c> is ASP.NET's, not the exception's, and shows up in the same files as
    /// PlatformHttpException handling all over the app estate.
    /// </summary>
    [Fact]
    public void Detector_IgnoresAspNetHttpContextResponse()
    {
        _app.Write(
            "logic/Middleware.cs",
            """
            using Altinn.App.Core.Helpers;
            public class Middleware
            {
                public async Task Invoke(HttpContext context, PlatformHttpException ex)
                {
                    context.Response.Headers.Append("X-Trace", "1");
                    HttpContext.Response.StatusCode = 500;
                    await context.Response.WriteAsJsonAsync(new { });
                }
            }
            """
        );

        var result = new PlatformHttpExceptionApiDetector(Scanner()).Detect();

        Assert.Empty(result.Todos);
        Assert.Empty(Locations(result));
    }

    [Fact]
    public void Detector_IgnoresFilesThatNeverMentionTheException()
    {
        _app.Write(
            "logic/Unrelated.cs",
            """
            public class Unrelated
            {
                public object Body(SomeOtherResult result) => result.Response.Content;
                public object Cast(object o) => o as HttpResponseMessage;
            }
            """
        );

        var result = new PlatformHttpExceptionApiDetector(Scanner()).Detect();

        Assert.Empty(result.Todos);
        Assert.Empty(Locations(result));
    }
}
