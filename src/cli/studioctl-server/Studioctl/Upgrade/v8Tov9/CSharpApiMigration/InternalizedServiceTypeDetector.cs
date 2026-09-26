using Altinn.Studio.Cli.Upgrade.ProjectFile;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the Altinn.App service classes that are internal in v9. Each of them implements
/// a service interface, and the interface is the supported way to reach the service: an app that
/// constructed the class itself, or declared a field or parameter with the class as its type, has to
/// inject the interface from the container instead. Every usage is reported (never rewritten) with the
/// interface the class implements, since the rewrite from a concrete type to an injected interface is
/// a design change for the app to make.
/// </summary>
/// <remarks>
/// With a semantic model the match is exact: only names that bind to a type in the Altinn.App packages
/// are reported, so an app's own <c>DataClient</c> is left alone. Without one (see
/// <see cref="CSharpSourceScanner.HasSemanticModels"/>) the names are common enough that a bare name
/// match would be noise, so a syntax-only file is reported only where it imports the class's own
/// namespace or spells the reference out fully qualified.
/// </remarks>
internal sealed class InternalizedServiceTypeDetector
{
    private sealed record InternalizedType(string Namespace, string? Interface);

    private static readonly IReadOnlyDictionary<string, InternalizedType> _types = new Dictionary<
        string,
        InternalizedType
    >(StringComparer.Ordinal)
    {
        ["AppResourcesSI"] = new("Altinn.App.Core.Implementation", "IAppResources"),
        ["AltinnPartyClient"] = new("Altinn.App.Core.Infrastructure.Clients.Register", "IAltinnPartyClient"),
        ["AppMetadata"] = new("Altinn.App.Core.Internal.App", "IAppMetadata"),
        ["AppOptionsFactory"] = new("Altinn.App.Core.Features.Options", null),
        ["AppOptionsFileHandler"] = new("Altinn.App.Core.Features.Options", "IAppOptionsFileHandler"),
        ["AppOptionsService"] = new("Altinn.App.Core.Features.Options", "IAppOptionsService"),
        ["ApplicationClient"] = new("Altinn.App.Core.Infrastructure.Clients.Storage", "IApplicationClient"),
        ["AuthenticationClient"] = new(
            "Altinn.App.Core.Infrastructure.Clients.Authentication",
            "IAuthenticationClient"
        ),
        ["AuthorizationClient"] = new("Altinn.App.Core.Infrastructure.Clients.Authorization", "IAuthorizationClient"),
        ["AuthorizationService"] = new("Altinn.App.Core.Internal.Auth", "IAuthorizationService"),
        ["ConfirmationProcessTask"] = new("Altinn.App.Core.Internal.Process.ProcessTasks", "IProcessTask"),
        ["CustomTelemetryInitializer"] = new("Altinn.App.Api.Infrastructure.Telemetry", "ITelemetryInitializer"),
        ["DataAnnotationValidator"] = new("Altinn.App.Core.Features.Validation.Default", "IFormDataValidator"),
        ["DataClient"] = new("Altinn.App.Core.Infrastructure.Clients.Storage", "IDataClient"),
        ["DataListsFactory"] = new("Altinn.App.Core.Features.DataLists", null),
        ["DataListsService"] = new("Altinn.App.Core.Features.DataLists", "IDataListsService"),
        ["DataProcessTask"] = new("Altinn.App.Core.Internal.Process.ProcessTasks", "IProcessTask"),
        ["DefaultAppEvents"] = new("Altinn.App.Core.Implementation", "IAppEvents"),
        ["DefaultAppModel"] = new("Altinn.App.Core.Internal.AppModel", "IAppModel"),
        ["DefaultDataElementValidator"] = new("Altinn.App.Core.Features.Validation.Default", "IDataElementValidator"),
        ["DefaultEFormidlingReceivers"] = new("Altinn.App.Core.EFormidling.Implementation", "IEFormidlingReceivers"),
        ["DefaultTaskValidator"] = new("Altinn.App.Core.Features.Validation.Default", "ITaskValidator"),
        ["EventsClient"] = new("Altinn.App.Core.Infrastructure.Clients.Events", "IEventsClient"),
        ["ExclusiveGatewayFactory"] = new("Altinn.App.Core.Internal.Process", null),
        ["ExpressionValidator"] = new("Altinn.App.Core.Features.Validation.Default", "IValidator"),
        ["ExpressionsExclusiveGateway"] = new("Altinn.App.Core.Internal.Process", "IProcessExclusiveGateway"),
        ["ExternalApiService"] = new("Altinn.App.Core.Features.ExternalApi", "IExternalApiService"),
        ["FeedbackProcessTask"] = new("Altinn.App.Core.Internal.Process.ProcessTasks", "IProcessTask"),
        ["FileAnalysisService"] = new("Altinn.App.Core.Features.FileAnalysis", "IFileAnalysisService"),
        ["FileAnalyzerFactory"] = new("Altinn.App.Core.Features.FileAnalysis", "IFileAnalyzerFactory"),
        ["FileValidationService"] = new("Altinn.App.Core.Internal.Validation", "IFileValidationService"),
        ["FileValidatorFactory"] = new("Altinn.App.Core.Internal.Validation", "IFileValidatorFactory"),
        ["FormBootstrapService"] = new("Altinn.App.Core.Features.Bootstrap", null),
        ["InstanceAppOptionsFactory"] = new("Altinn.App.Core.Features.Options", null),
        ["InstanceDataListsFactory"] = new("Altinn.App.Core.Features.DataLists", null),
        ["InstanceEventClient"] = new("Altinn.App.Core.Infrastructure.Clients.Storage", "IInstanceEventClient"),
        ["JoinedAppOptionsProvider"] = new("Altinn.App.Core.Features.Options", "IAppOptionsProvider"),
        ["LayoutEvaluatorStateInitializer"] = new(
            "Altinn.App.Core.Internal.Expressions",
            "ILayoutEvaluatorStateInitializer"
        ),
        ["NullInstantiationProcessor"] = new("Altinn.App.Core.Features.DataProcessing", "IInstantiationProcessor"),
        ["NullInstantiationValidator"] = new("Altinn.App.Core.Features.Validation", "IInstantiationValidator"),
        ["NullPdfFormatter"] = new("Altinn.App.Core.Features.Pdf", "IPdfFormatter"),
        ["NullTypeProcessTask"] = new("Altinn.App.Core.Internal.Process.ProcessTasks", "IProcessTask"),
        ["PdfService"] = new("Altinn.App.Core.Internal.Pdf", "IPdfService"),
        ["PersonClient"] = new("Altinn.App.Core.Infrastructure.Clients.Register", "IPersonClient"),
        ["PrefillSI"] = new("Altinn.App.Core.Implementation", "IPrefill"),
        ["ProcessClient"] = new("Altinn.App.Core.Infrastructure.Clients.Storage", "IProcessClient"),
        ["ProcessNavigator"] = new("Altinn.App.Core.Internal.Process", "IProcessNavigator"),
        ["ProcessReader"] = new("Altinn.App.Core.Internal.Process", "IProcessReader"),
        ["ProcessTaskDataLocker"] = new("Altinn.App.Core.Internal.Process.ProcessTasks", "IProcessTaskDataLocker"),
        ["ProfileClientCachingDecorator"] = new("Altinn.App.Core.Infrastructure.Clients.Profile", "IProfileClient"),
        ["ProfileClient"] = new("Altinn.App.Core.Infrastructure.Clients.Profile", "IProfileClient"),
        ["RegisterERClient"] = new("Altinn.App.Core.Infrastructure.Clients.Register", "IOrganizationClient"),
        ["RequiredLayoutValidator"] = new("Altinn.App.Core.Features.Validation.Default", "IValidator"),
        ["SecretsClient"] = new("Altinn.App.Core.Infrastructure.Clients.KeyVault", "ISecretsClient"),
        ["SecretsLocalClient"] = new("Altinn.App.Core.Infrastructure.Clients.KeyVault", "ISecretsClient"),
        ["SendOnProcessNotEnded"] = new(
            "Altinn.App.Core.Features.Notifications.Cancellation",
            "ICancelInstantiationNotification"
        ),
        ["SignClient"] = new("Altinn.App.Core.Infrastructure.Clients.Storage", "ISignClient"),
        ["UserActionAuthorizerProvider"] = new(
            "Altinn.App.Core.Internal.Process.Authorization",
            "IUserActionAuthorizerProvider"
        ),
        ["UserTokenProvider"] = new("Altinn.App.Core.Implementation", "IUserTokenProvider"),
        ["ValidationService"] = new("Altinn.App.Core.Internal.Validation", "IValidationService"),
        ["ValidatorFactory"] = new("Altinn.App.Core.Internal.Validation", "IValidatorFactory"),
    };

    private static readonly IReadOnlySet<string> _typeNames = _types.Keys.ToHashSet(StringComparer.Ordinal);

    private const string Summary =
        "These Altinn.App service classes are internal in v9. Inject the interface named next to each usage "
        + "instead; code that constructed the class or declared a field or parameter with it as the type must "
        + "use the interface from the container. A class listed without an interface has no app-facing "
        + "replacement. Usages found:";

    private readonly CSharpSourceScanner _scanner;
    private readonly IReadOnlySet<string> _projectGlobalNamespaces;
    private readonly Lazy<IReadOnlySet<string>> _sourceGlobalNamespaces;

    /// <param name="scanner">The app's C# source.</param>
    /// <param name="projectGlobalNamespaces">
    /// Namespaces the project file imports everywhere (implicit usings and <c>&lt;Using Include&gt;</c>
    /// items), which the syntax-only fallback has to count as imported in every file.
    /// </param>
    public InternalizedServiceTypeDetector(
        CSharpSourceScanner scanner,
        IReadOnlySet<string>? projectGlobalNamespaces = null
    )
    {
        _scanner = scanner;
        _projectGlobalNamespaces = projectGlobalNamespaces ?? new HashSet<string>(StringComparer.Ordinal);
        _sourceGlobalNamespaces = new Lazy<IReadOnlySet<string>>(() =>
            _scanner
                .Files.SelectMany(static file => ImportedNamespaces(file, globalOnly: true))
                .ToHashSet(StringComparer.Ordinal)
        );
    }

    public MigrationResult Detect()
    {
        var matches = _scanner
            .Files.SelectMany(file =>
                file.SemanticModel is { } semanticModel
                    ? CSharpSemanticQueries.AltinnTypeReferences(file, semanticModel, _typeNames)
                    : SyntaxMatches(file)
            )
            .Select(WithReplacement);

        return WarnOnlyDetector.Report(Summary, matches);
    }

    private IEnumerable<CSharpApiMatch> SyntaxMatches(ScannedCSharpFile file)
    {
        // A `global using` anywhere in the app and the project file's imports reach this file too.
        var importedNamespaces = ImportedNamespaces(file, globalOnly: false)
            .Concat(_sourceGlobalNamespaces.Value)
            .Concat(_projectGlobalNamespaces)
            .ToHashSet(StringComparer.Ordinal);

        var importedNames = _types
            .Where(pair => importedNamespaces.Contains(pair.Value.Namespace))
            .Select(static pair => pair.Key)
            .ToHashSet(StringComparer.Ordinal);

        // TypeReferences leaves base-list names to TypesImplementing, so both are needed to see a
        // class that derives from an internalized one as well as one that injects or constructs it.
        IEnumerable<CSharpApiMatch> bareReferences =
            importedNames.Count == 0
                ? []
                : CSharpSyntaxQueries
                    .TypesImplementing(file, importedNames)
                    .Concat(CSharpSyntaxQueries.TypeReferences(file, importedNames));

        // A fully qualified reference names the namespace itself, so it is unambiguous without a using.
        var qualifiedReferences = _types
            .Values.Select(static type => type.Namespace)
            .Distinct(StringComparer.Ordinal)
            .SelectMany(ns => CSharpSyntaxQueries.QualifiedNameReferences(file, ns))
            .Select(static match => match with { Symbol = LastSegment(match.Symbol) })
            .Where(static match => _types.ContainsKey(match.Symbol));

        return bareReferences.Concat(qualifiedReferences);
    }

    /// <summary>
    /// The namespaces a file's plain <c>using</c> directives import (aliases and static imports are not
    /// namespace imports), optionally only the <c>global</c> ones, which apply to every file in the project.
    /// </summary>
    private static IEnumerable<string> ImportedNamespaces(ScannedCSharpFile file, bool globalOnly)
    {
        foreach (var directive in file.Root.DescendantNodes().OfType<UsingDirectiveSyntax>())
        {
            if (directive.Alias is not null || directive.StaticKeyword.IsKind(SyntaxKind.StaticKeyword))
            {
                continue;
            }

            if (globalOnly && !directive.GlobalKeyword.IsKind(SyntaxKind.GlobalKeyword))
            {
                continue;
            }

            if (directive.Name?.ToString() is { } name)
            {
                yield return name.StartsWith("global::", StringComparison.Ordinal) ? name["global::".Length..] : name;
            }
        }
    }

    /// <summary>
    /// Appends the interface to inject. A base-list match from <see cref="CSharpSyntaxQueries.TypesImplementing"/>
    /// is shaped <c>"Derived : Base"</c>, so the internalized name is the part after the colon.
    /// </summary>
    private static CSharpApiMatch WithReplacement(CSharpApiMatch match)
    {
        var separator = match.Symbol.LastIndexOf(" : ", StringComparison.Ordinal);
        var typeName = separator < 0 ? match.Symbol : match.Symbol[(separator + 3)..];
        var replacement = _types[typeName].Interface;
        var symbol = replacement is null ? match.Symbol : $"{match.Symbol} (implements {replacement})";
        return match with { Symbol = symbol };
    }

    private static string LastSegment(string qualifiedName)
    {
        var separator = qualifiedName.LastIndexOf('.');
        return separator < 0 ? qualifiedName : qualifiedName[(separator + 1)..];
    }
}
