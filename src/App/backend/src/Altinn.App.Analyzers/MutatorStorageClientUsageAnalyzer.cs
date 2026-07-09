namespace Altinn.App.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class MutatorStorageClientUsageAnalyzer : DiagnosticAnalyzer
{
    private static readonly SymbolEqualityComparer _comparer = SymbolEqualityComparer.Default;

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.CodeSmells.MutatorStorageClientUsage];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            if (!startContext.Options.AnalyzerConfigOptionsProvider.IsAltinnApp())
                return;

            var storageClientSymbols = GetSymbols(
                startContext.Compilation,
                ["Altinn.App.Core.Internal.Data.IDataClient", "Altinn.App.Core.Internal.Instances.IInstanceClient"]
            );
            if (storageClientSymbols.IsEmpty)
                return;

            // Keep this list conservative. It covers high-value extension points and helper
            // classes where the contract itself signals active unit-of-work instance access.
            var mutatorSurfaceSymbols = GetSymbols(
                startContext.Compilation,
                [
                    "Altinn.App.Clients.Fiks.FiksArkiv.IFiksArkivConfigResolver",
                    "Altinn.App.Clients.Fiks.FiksArkiv.IFiksArkivHost",
                    "Altinn.App.Clients.Fiks.FiksArkiv.IFiksArkivPayloadGenerator",
                    "Altinn.App.Core.EFormidling.Interface.IEFormidlingMetadata",
                    "Altinn.App.Core.EFormidling.Interface.IEFormidlingReceivers",
                    "Altinn.App.Core.EFormidling.Interface.IEFormidlingService",
                    "Altinn.App.Core.Features.Process.IServiceTask",
                    "Altinn.App.Core.Internal.Process.ProcessTasks.IProcessTask",
                    "Altinn.App.Core.Features.Process.IOnTaskStartingHandler",
                    "Altinn.App.Core.Features.Process.IOnTaskEndingHandler",
                    "Altinn.App.Core.Features.Process.IOnTaskAbandonHandler",
                    "Altinn.App.Core.Features.Process.IOnProcessEndingHandler",
                    "Altinn.App.Core.Features.IDataWriteProcessor",
                    "Altinn.App.Core.Features.IDataProcessor",
                    "Altinn.App.Core.Features.IUserAction",
                    "Altinn.App.Core.Features.Signing.ISigneeProvider",
                    "Altinn.App.Core.Features.IInstantiationProcessor",
                ]
            );

            var mutatorContextSymbols = GetSymbols(
                startContext.Compilation,
                [
                    "Altinn.App.Core.Features.IInstanceDataMutator",
                    "Altinn.App.Core.Features.IInstanceDataAccessor",
                    "Altinn.App.Core.Internal.Process.ProcessTasks.ProcessTaskContext",
                    "Altinn.App.Core.Features.Process.ServiceTaskContext",
                    "Altinn.App.Core.Features.Process.OnTaskStartingContext",
                    "Altinn.App.Core.Features.Process.OnTaskEndingHandlerContext",
                    "Altinn.App.Core.Features.Process.OnTaskAbandonHandlerContext",
                    "Altinn.App.Core.Features.Process.OnProcessEndingHandlerContext",
                    "Altinn.App.Core.Models.UserAction.UserActionContext",
                    "Altinn.App.Core.Features.Signing.GetSigneesParameters",
                ]
            );

            if (mutatorSurfaceSymbols.IsEmpty && mutatorContextSymbols.IsEmpty)
                return;

            startContext.RegisterSymbolAction(
                context =>
                    AnalyzeNamedType(context, storageClientSymbols, mutatorSurfaceSymbols, mutatorContextSymbols),
                SymbolKind.NamedType
            );
        });
    }

    private static void AnalyzeNamedType(
        SymbolAnalysisContext context,
        ImmutableArray<INamedTypeSymbol> storageClientSymbols,
        ImmutableArray<INamedTypeSymbol> mutatorSurfaceSymbols,
        ImmutableArray<INamedTypeSymbol> mutatorContextSymbols
    )
    {
        if (context.Symbol is not INamedTypeSymbol { TypeKind: TypeKind.Class, IsImplicitlyDeclared: false } type)
            return;

        var mutatorSurfaceName = GetMutatorSurfaceName(type, mutatorSurfaceSymbols);
        var classSurfaceName = mutatorSurfaceName ?? GetMutatorContextSurfaceName(type, mutatorContextSymbols);

        if (classSurfaceName is not null)
        {
            AnalyzeConstructors(context, type, storageClientSymbols, classSurfaceName);
            AnalyzeFields(context, type, storageClientSymbols, classSurfaceName);
            AnalyzeProperties(context, type, storageClientSymbols, classSurfaceName);
        }

        AnalyzeMethods(context, type, storageClientSymbols, mutatorContextSymbols, mutatorSurfaceName);
    }

    private static void AnalyzeConstructors(
        SymbolAnalysisContext context,
        INamedTypeSymbol type,
        ImmutableArray<INamedTypeSymbol> storageClientSymbols,
        string mutatorSurfaceName
    )
    {
        foreach (var constructor in type.InstanceConstructors)
        {
            if (constructor.IsImplicitlyDeclared)
                continue;

            foreach (var parameter in constructor.Parameters)
                ReportIfStorageClient(context, parameter.Type, parameter, mutatorSurfaceName, storageClientSymbols);
        }
    }

    private static void AnalyzeFields(
        SymbolAnalysisContext context,
        INamedTypeSymbol type,
        ImmutableArray<INamedTypeSymbol> storageClientSymbols,
        string mutatorSurfaceName
    )
    {
        foreach (var field in type.GetMembers().OfType<IFieldSymbol>())
        {
            if (field.IsStatic || field.IsImplicitlyDeclared)
                continue;

            ReportIfStorageClient(context, field.Type, field, mutatorSurfaceName, storageClientSymbols);
        }
    }

    private static void AnalyzeProperties(
        SymbolAnalysisContext context,
        INamedTypeSymbol type,
        ImmutableArray<INamedTypeSymbol> storageClientSymbols,
        string mutatorSurfaceName
    )
    {
        foreach (var property in type.GetMembers().OfType<IPropertySymbol>())
        {
            if (property.IsStatic || property.IsImplicitlyDeclared)
                continue;

            ReportIfStorageClient(context, property.Type, property, mutatorSurfaceName, storageClientSymbols);
        }
    }

    private static void AnalyzeMethods(
        SymbolAnalysisContext context,
        INamedTypeSymbol type,
        ImmutableArray<INamedTypeSymbol> storageClientSymbols,
        ImmutableArray<INamedTypeSymbol> mutatorContextSymbols,
        string? mutatorSurfaceName
    )
    {
        foreach (var method in type.GetMembers().OfType<IMethodSymbol>())
        {
            if (method.IsStatic || method.IsImplicitlyDeclared || method.MethodKind != MethodKind.Ordinary)
                continue;

            var methodSurfaceName = mutatorSurfaceName ?? GetMutatorContextParameterName(method, mutatorContextSymbols);
            if (methodSurfaceName is null)
                continue;

            foreach (var parameter in method.Parameters)
                ReportIfStorageClient(context, parameter.Type, parameter, methodSurfaceName, storageClientSymbols);
        }
    }

    private static ImmutableArray<INamedTypeSymbol> GetSymbols(Compilation compilation, string[] metadataNames)
    {
        var builder = ImmutableArray.CreateBuilder<INamedTypeSymbol>(metadataNames.Length);

        foreach (var metadataName in metadataNames)
        {
            var symbol = compilation.GetTypeByMetadataName(metadataName);
            if (symbol is not null)
                builder.Add(symbol);
        }

        return builder.ToImmutable();
    }

    private static string? GetMutatorSurfaceName(
        INamedTypeSymbol type,
        ImmutableArray<INamedTypeSymbol> mutatorSurfaceSymbols
    )
    {
        foreach (var mutatorSurfaceSymbol in mutatorSurfaceSymbols)
        {
            foreach (var implementedInterface in type.AllInterfaces)
            {
                if (_comparer.Equals(implementedInterface.OriginalDefinition, mutatorSurfaceSymbol))
                    return mutatorSurfaceSymbol.Name;
            }
        }

        return null;
    }

    private static string? GetMutatorContextParameterName(
        IMethodSymbol method,
        ImmutableArray<INamedTypeSymbol> mutatorContextSymbols
    )
    {
        foreach (var parameter in method.Parameters)
        {
            var mutatorContextSymbol = FindMatchingNamedType(parameter.Type, mutatorContextSymbols);
            if (mutatorContextSymbol is not null)
                return mutatorContextSymbol.Name;
        }

        return null;
    }

    private static string? GetMutatorContextSurfaceName(
        INamedTypeSymbol type,
        ImmutableArray<INamedTypeSymbol> mutatorContextSymbols
    )
    {
        foreach (var method in type.GetMembers().OfType<IMethodSymbol>())
        {
            if (method.IsStatic || method.IsImplicitlyDeclared || method.MethodKind != MethodKind.Ordinary)
                continue;

            var mutatorContextName = GetMutatorContextParameterName(method, mutatorContextSymbols);
            if (mutatorContextName is not null)
                return mutatorContextName;
        }

        return null;
    }

    private static void ReportIfStorageClient(
        SymbolAnalysisContext context,
        ITypeSymbol type,
        ISymbol symbol,
        string mutatorSurfaceName,
        ImmutableArray<INamedTypeSymbol> storageClientSymbols
    )
    {
        var storageClientSymbol = FindMatchingNamedType(type, storageClientSymbols);
        if (storageClientSymbol is null)
            return;

        var location = symbol.Locations.FirstOrDefault(static location => location.IsInSource);
        if (location is null)
            return;

        var diagnostic = Diagnostic.Create(
            Diagnostics.CodeSmells.MutatorStorageClientUsage,
            location,
            storageClientSymbol.Name,
            mutatorSurfaceName
        );
        context.ReportDiagnostic(diagnostic);
    }

    private static INamedTypeSymbol? FindMatchingNamedType(
        ITypeSymbol type,
        ImmutableArray<INamedTypeSymbol> targetSymbols
    )
    {
        if (type is IArrayTypeSymbol arrayType)
            return FindMatchingNamedType(arrayType.ElementType, targetSymbols);

        if (type is not INamedTypeSymbol namedType)
            return null;

        foreach (var targetSymbol in targetSymbols)
        {
            if (
                _comparer.Equals(namedType.OriginalDefinition, targetSymbol)
                || _comparer.Equals(namedType, targetSymbol)
            )
            {
                return targetSymbol;
            }
        }

        foreach (var typeArgument in namedType.TypeArguments)
        {
            var targetSymbol = FindMatchingNamedType(typeArgument, targetSymbols);
            if (targetSymbol is not null)
                return targetSymbol;
        }

        return null;
    }
}
