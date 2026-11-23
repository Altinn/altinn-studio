using System.Collections.Concurrent;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers;

/// <summary>
/// Reports a method on a process task that is named after one of <c>IProcessTask</c>'s default-implemented members
/// (<c>DefineStart</c>, <c>DefineEnd</c>, <c>DefineAbandon</c>, <c>ValidateConfiguration</c>) but neither implements
/// it nor is called anywhere in the app, such as <c>DefineStart(PipelineBuilder.ServiceTask pipeline)</c> in a service
/// task. Because the member has a default, the task still compiles, and the default runs in place of the method.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Calibration, per <see cref="IncompleteBuilderAnalyzer"/>'s doctrine:</strong> this is Error severity, so
/// a false positive breaks an app's build, and only the provable case is reported. Whether the member is
/// implemented is the compiler's own interface mapping (<c>FindImplementationForInterfaceMember</c>), so the rule
/// fires only when that mapping lands on an interface's default rather than on a method of the task or one of its
/// base classes. Once the task implements a member, every other method of that name is an overload the author may
/// want, and is not reported. Nor is a method whose signature was chosen elsewhere: an override, whose base method
/// is reported instead when it is a task's own, or an implementation of another interface's member of that name.
/// </para>
/// <para>
/// A task that inherits the interface from a base class keeps that class's mapping, so its own method is reported
/// even with the right signature, and the message says to list the interface.
/// </para>
/// <para>
/// A method that code anywhere in the app invokes or passes as a delegate runs, so it is a helper of that name
/// rather than a mistake, and is not reported. That holds even when the caller is itself never called: whether code
/// runs is beyond what an analyzer can prove, and an uncalled private method is the unused-member diagnostics' to
/// report. Calls are looked for in the whole compilation, generated code included, so a base class's helper that a
/// derived task calls counts too, and the rule reports only once the whole compilation is analyzed. A method declared
/// in generated code is not reported.
/// </para>
/// <para>
/// The members are read from the interface: every instance method of <c>IProcessTask</c> with a body, so a default
/// member added later is covered without a change here.
/// </para>
/// </remarks>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ProcessTaskDefaultMemberAnalyzer : DiagnosticAnalyzer
{
    private const string ProcessTaskInterface = "Altinn.App.Core.Internal.Process.ProcessTasks.IProcessTask";

    // Type names as the author writes them with the usual usings: PipelineBuilder.Lifecycle, IEnumerable<string>.
    private static readonly SymbolDisplayFormat _signatureFormat = new(
        typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypes,
        genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters,
        memberOptions: SymbolDisplayMemberOptions.IncludeType | SymbolDisplayMemberOptions.IncludeParameters,
        parameterOptions: SymbolDisplayParameterOptions.IncludeType
            | SymbolDisplayParameterOptions.IncludeName
            | SymbolDisplayParameterOptions.IncludeParamsRefOut,
        miscellaneousOptions: SymbolDisplayMiscellaneousOptions.UseSpecialTypes
            | SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers
            | SymbolDisplayMiscellaneousOptions.IncludeNullableReferenceTypeModifier
    );

    private static readonly SymbolDisplayFormat _methodFormat = _signatureFormat
        .WithMemberOptions(SymbolDisplayMemberOptions.IncludeParameters)
        .WithParameterOptions(SymbolDisplayParameterOptions.IncludeType);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.Contracts.ProcessTaskMemberNotImplemented];

    public override void Initialize(AnalysisContext context)
    {
        // Generated code is analyzed for its calls, such as a source generator's partial part of a task. The driver
        // drops a diagnostic in generated code, since the flags leave out ReportDiagnostics.
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.Analyze);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            if (!startContext.Options.AnalyzerConfigOptionsProvider.IsAltinnApp())
                return;

            var processTask = startContext.Compilation.GetTypeByMetadataName(ProcessTaskInterface);
            if (processTask is null)
                return;

            var defaultMembers = processTask
                .GetMembers()
                .OfType<IMethodSymbol>()
                .Where(member =>
                    member is { MethodKind: MethodKind.Ordinary, IsStatic: false, IsAbstract: false, IsVirtual: true }
                )
                .ToLookup(member => member.Name, StringComparer.Ordinal);
            if (defaultMembers.Count == 0)
                return;

            var findings = new ConcurrentBag<(IMethodSymbol Method, Diagnostic Diagnostic)>();
            var called = new ConcurrentDictionary<IMethodSymbol, bool>(SymbolEqualityComparer.Default);

            startContext.RegisterSymbolAction(
                symbolContext =>
                {
                    var type = (INamedTypeSymbol)symbolContext.Symbol;
                    foreach (var finding in Findings(type, processTask, defaultMembers))
                        findings.Add(finding);
                },
                SymbolKind.NamedType
            );

            // A method passed as a delegate runs too, such as a stage given to the pipeline.
            startContext.RegisterOperationAction(
                operationContext =>
                {
                    var target = operationContext.Operation switch
                    {
                        IInvocationOperation invocation => invocation.TargetMethod,
                        IMethodReferenceOperation reference => reference.Method,
                        _ => null,
                    };
                    if (target is not null && defaultMembers.Contains(target.Name))
                        called.TryAdd(target.OriginalDefinition, true);
                },
                OperationKind.Invocation,
                OperationKind.MethodReference
            );

            // A call can be anywhere in the compilation, so a finding is settled only once all of it is analyzed.
            startContext.RegisterCompilationEndAction(endContext =>
            {
                foreach (var (method, diagnostic) in findings)
                {
                    if (!called.ContainsKey(method))
                        endContext.ReportDiagnostic(diagnostic);
                }
            });
        });
    }

    /// <summary>
    /// The diagnostics for <paramref name="type"/>'s methods that are named after a member it does not implement, by
    /// method, or none when it is not a process task.
    /// </summary>
    private static List<(IMethodSymbol Method, Diagnostic Diagnostic)> Findings(
        INamedTypeSymbol type,
        INamedTypeSymbol processTask,
        ILookup<string, IMethodSymbol> defaultMembers
    )
    {
        var findings = new List<(IMethodSymbol Method, Diagnostic Diagnostic)>();
        if (
            type.TypeKind is not (TypeKind.Class or TypeKind.Struct)
            || !type.AllInterfaces.Contains(processTask, SymbolEqualityComparer.Default)
        )
        {
            return findings;
        }

        // A type that inherits the interface from a base class keeps that class's mapping: none of its own methods
        // implements a member, whatever its signature, until it lists the interface again.
        var listsInterface = type.Interfaces.Any(listed =>
            SymbolEqualityComparer.Default.Equals(listed, processTask)
            || listed.AllInterfaces.Contains(processTask, SymbolEqualityComparer.Default)
        );

        foreach (var members in defaultMembers)
        {
            if (members.Any(member => IsImplementedByType(type, member)))
                continue;

            // The first member of the name is the one the message suggests. IProcessTask has no overloaded default
            // today.
            var member = members.First();
            var remedy = $"Declare it as 'public {member.ToDisplayString(_signatureFormat)}'";
            if (!listsInterface)
            {
                remedy +=
                    $" and list {processTask.Name} among the interfaces of '{type.Name}': it inherits the interface "
                    + "from a base class, and its own methods implement only an interface it lists itself";
            }

            foreach (var method in type.GetMembers(members.Key).OfType<IMethodSymbol>())
            {
                if (
                    method.MethodKind != MethodKind.Ordinary
                    || !HasOwnSignature(type, method)
                    || method.Locations.FirstOrDefault() is not { } location
                )
                {
                    continue;
                }

                findings.Add(
                    (
                        method,
                        Diagnostic.Create(
                            Diagnostics.Contracts.ProcessTaskMemberNotImplemented,
                            location,
                            $"{type.Name}.{method.ToDisplayString(_methodFormat)}",
                            $"{processTask.Name}.{member.ToDisplayString(_methodFormat)}",
                            remedy
                        )
                    )
                );
            }
        }

        return findings;
    }

    /// <summary>
    /// Whether the author chose <paramref name="method"/>'s signature here. An override takes it from the method it
    /// overrides, and a method that implements another interface's member of the same name takes it from that
    /// interface.
    /// </summary>
    private static bool HasOwnSignature(INamedTypeSymbol type, IMethodSymbol method) =>
        !method.IsOverride
        && !type.AllInterfaces.Any(@interface =>
            @interface
                .GetMembers(method.Name)
                .Any(member =>
                    SymbolEqualityComparer.Default.Equals(type.FindImplementationForInterfaceMember(member), method)
                )
        );

    /// <summary>
    /// Whether an instance of <paramref name="type"/> runs a method of its own or of a base class for
    /// <paramref name="member"/>, rather than an interface's default. A mapping that resolves to nothing is taken as
    /// implemented, since the compiler reports that case itself.
    /// </summary>
    private static bool IsImplementedByType(INamedTypeSymbol type, IMethodSymbol member) =>
        type.FindImplementationForInterfaceMember(member) is not IMethodSymbol implementation
        || implementation.ContainingType.TypeKind != TypeKind.Interface;
}
