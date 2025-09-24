using System.Reflection;

namespace Altinn.App.Internal.Analyzers;

file static class Diagnostics
{
    public static readonly ImmutableArray<DiagnosticDescriptor> All;

    static Diagnostics()
    {
        var getDiagnostics = static (Type type) =>
            type.GetFields(BindingFlags.Public | BindingFlags.Static)
                .Where(f => f.FieldType == typeof(DiagnosticDescriptor))
                .Select(f => (DiagnosticDescriptor)f.GetValue(null));

        All = ImmutableArray.CreateRange(getDiagnostics(typeof(Diagnostics)));
    }

    public static readonly DiagnosticDescriptor UnknownError = Error(
        "ALTINNINT9999",
        Category.General,
        "Unknown analyzer error",
        "Unknown error occurred during analysis: '{0}'"
    );

    public static readonly DiagnosticDescriptor DangerousConstructorInjection = Error(
        "ALTINNINT0001",
        Category.General,
        "Dangerous constructor injection",
        "Service interface '{0}' is injected into the constructor of '{1}'."
            + " This is dangerous as we couple the lifetime of '{1}' to the lifetime of the implementation of '{0}'."
            + " Use the 'AppImplementationFactory' to instantiate app implementations lazily instead."
    );

    public static readonly DiagnosticDescriptor DangerousServiceProviderServiceResolution = Error(
        "ALTINNINT0002",
        Category.General,
        "Dangerous 'IServiceProvider' service resolution",
        "App implementable service interface '{0}' is resolved through 'IServiceProvider'."
            + " App implementable interfaces are only meant to be resolved through 'AppImplementationFactory'."
    );

    public static readonly DiagnosticDescriptor DangerousAppImplementationFactoryUse = Error(
        "ALTINNINT0003",
        Category.General,
        "Dangerous 'AppImplementationFactory' service resolution",
        "App implementable service interface '{0}' is resolved through 'AppImplementationFactory' in a constructor."
            + " App implementable interfaces are only meant to be resolved lazily (as late as possible, right before use) to ensure expected lifetime."
    );

    public static readonly DiagnosticDescriptor NonAppImplementableServiceThroughAppImplementationFactory = Error(
        "ALTINNINT0004",
        Category.General,
        "Invalid 'AppImplementationFactory' service resolution",
        "Non-appimplementable service interface '{0}' is resolved through 'AppImplementationFactory'."
            + " You can use 'IServiceProvider' for these instead."
    );

    private static DiagnosticDescriptor Error(string id, string category, string title, string messageFormat) =>
        Create(id, title, messageFormat, category, DiagnosticSeverity.Error);

    private static DiagnosticDescriptor Create(
        string id,
        string title,
        string messageFormat,
        string category,
        DiagnosticSeverity severity
    ) => new(id, title, messageFormat, category, severity, true, helpLinkUri: null);

    private static class Category
    {
        public const string General = nameof(General);
    }
}

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class AppImplementationInjectionAnalyzer : DiagnosticAnalyzer
{
    private const string MarkerAttributeName = "ImplementableByAppsAttribute";
    private static readonly SymbolEqualityComparer _comparer = SymbolEqualityComparer.Default;

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => Diagnostics.All;

    public override void Initialize(AnalysisContext context)
    {
        context.EnableConcurrentExecution();
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);

        context.RegisterSyntaxNodeAction(AnalyzeConstructors, SyntaxKind.ParameterList);
        context.RegisterSyntaxNodeAction(AnalyzeDIServiceCalls, SyntaxKind.InvocationExpression);
        context.RegisterSyntaxNodeAction(
            AnalyzeAppImplementationFactoryConstructorUse,
            SyntaxKind.InvocationExpression
        );
        context.RegisterSyntaxNodeAction(
            AnalyzeNonAppimplementableServicesThroughAppImplementationFactory,
            SyntaxKind.InvocationExpression
        );
    }

    private static void AnalyzeNonAppimplementableServicesThroughAppImplementationFactory(
        SyntaxNodeAnalysisContext context
    )
    {
        var semanticModel = context.SemanticModel;
        var invocation = (InvocationExpressionSyntax)context.Node;
        var methodSymbol = semanticModel.GetSymbolInfo(invocation, context.CancellationToken).Symbol as IMethodSymbol;
        if (methodSymbol is null)
            return;

        var appImplementationFactoryType = GetAppImplementationFactorySymbol(context);
        if (appImplementationFactoryType is null)
            return;

        if (!_comparer.Equals(methodSymbol.ContainingType, appImplementationFactoryType))
            return;

        var typeInfo = GetAppImplementationFactoryInvocationTypeArgument(
            context,
            appImplementationFactoryType,
            invocation
        );
        if (typeInfo is null)
            return;

        if (IsMarkedWithAttribute(typeInfo))
            return;

        var diagnostic = Diagnostic.Create(
            Diagnostics.NonAppImplementableServiceThroughAppImplementationFactory,
            invocation.GetLocation(),
            typeInfo.Name
        );
        context.ReportDiagnostic(diagnostic);
    }

    private static void AnalyzeAppImplementationFactoryConstructorUse(SyntaxNodeAnalysisContext context)
    {
        var invocation = (InvocationExpressionSyntax)context.Node;

        var methodSymbol =
            context.SemanticModel.GetSymbolInfo(invocation, context.CancellationToken).Symbol as IMethodSymbol;
        if (methodSymbol is null)
            return;

        var appImplementationFactoryType = GetAppImplementationFactorySymbol(context);
        if (appImplementationFactoryType is null)
            return;

        if (!_comparer.Equals(methodSymbol.ContainingType, appImplementationFactoryType))
            return;

        var parent = context.Node.Parent;
        while (parent != null)
        {
            // Checks if the invocation is in a constructor body or field initializer (primary constructor)
            if (parent is ConstructorDeclarationSyntax or FieldDeclarationSyntax or PropertyDeclarationSyntax)
            {
                // If this is a property with a null initializer, it is probably an arrow property, which is lazy
                if (parent is PropertyDeclarationSyntax { Initializer: null })
                    break;

                var typeInfo = GetAppImplementationFactoryInvocationTypeArgument(
                    context,
                    appImplementationFactoryType,
                    invocation
                );
                if (typeInfo is null || !IsMarkedWithAttribute(typeInfo))
                    return;
                var diagnostic = Diagnostic.Create(
                    Diagnostics.DangerousAppImplementationFactoryUse,
                    invocation.GetLocation(),
                    typeInfo.Name
                );
                context.ReportDiagnostic(diagnostic);
                break;
            }

            if (parent is MethodDeclarationSyntax or ClassDeclarationSyntax)
            {
                // We can stop checking
                break;
            }

            parent = parent.Parent;
        }
    }

    private static void AnalyzeDIServiceCalls(SyntaxNodeAnalysisContext context)
    {
        var invocation = (InvocationExpressionSyntax)context.Node;

        // This code checks the following forms of IServiceProvider service resolutions
        // sp.GetService<IEFormidlingMetadata>();
        // sp.GetService(typeof(IEFormidlingMetadata));
        // sp.GetRequiredService<IEFormidlingMetadata>();
        // sp.GetRequiredService(typeof(IEFormidlingMetadata));
        // ServiceProviderServiceExtensions.GetRequiredService<IEFormidlingMetadata>(_sp);
        // As we need the code to resolve through 'AppImplementationFactory' instead

        var methodSymbol =
            context.SemanticModel.GetSymbolInfo(invocation, context.CancellationToken).Symbol as IMethodSymbol;
        if (methodSymbol is null)
            return;

        var serviceProviderType = GetIServiceProviderSymbol(context);
        if (serviceProviderType is null)
            return;
        var enumerableType = GetIEnumerableSymbol(context);
        if (enumerableType is null)
            return;

        var arguments = invocation.ArgumentList.Arguments;
        bool isLongFormExtMethodCall = false;
        if (methodSymbol.IsExtensionMethod)
        {
            if (arguments.Count is > 0)
            {
                var firstArgType = context
                    .SemanticModel.GetTypeInfo(arguments[0].Expression, context.CancellationToken)
                    .Type;
                isLongFormExtMethodCall = _comparer.Equals(firstArgType, serviceProviderType);
            }
            if (!_comparer.Equals(methodSymbol.ReceiverType, serviceProviderType) && !isLongFormExtMethodCall)
                return;
        }
        else
        {
            if (!_comparer.Equals(methodSymbol.ContainingType, serviceProviderType))
                return;
        }

        // check the generic form, e.g. GetService<T>()
        TypeSyntax? typeSyntax = null;
        var typeArgumentList = invocation.DescendantNodes().OfType<TypeArgumentListSyntax>().FirstOrDefault();
        if (typeArgumentList is not null)
        {
            typeSyntax = typeArgumentList.Arguments.FirstOrDefault();
        }

        // check the non-generic form, e.g. GetService(typeof(T))
        if (arguments.Count >= (isLongFormExtMethodCall ? 2 : 1))
        {
            var argument = arguments[isLongFormExtMethodCall ? 1 : 0];
            if (argument.Expression is TypeOfExpressionSyntax typeOfExpression)
                typeSyntax = typeOfExpression.Type;
        }

        if (typeSyntax is null or PredefinedTypeSyntax)
            return;

        var typeInfoSymbol = ResolveTypeSyntaxToPotentialAppImplementableType(context, typeSyntax);
        if (typeInfoSymbol is not INamedTypeSymbol typeInfo)
            return;

        if (typeInfo.IsGenericType && _comparer.Equals(typeInfo.ConstructUnboundGenericType(), enumerableType))
        {
            var enumerableTypeArgument = typeInfo.TypeArguments.FirstOrDefault();
            if (enumerableTypeArgument is ITypeParameterSymbol typeParameterSymbol)
                enumerableTypeArgument = GetMostRelevantConstraintType(typeParameterSymbol);
            if (enumerableTypeArgument is not INamedTypeSymbol innerType)
                return;
            typeInfo = innerType;
        }

        if (IsMarkedWithAttribute(typeInfo))
        {
            var diagnostic = Diagnostic.Create(
                Diagnostics.DangerousServiceProviderServiceResolution,
                invocation.GetLocation(),
                typeInfo.Name
            );

            context.ReportDiagnostic(diagnostic);
        }
    }

    private static void AnalyzeConstructors(SyntaxNodeAnalysisContext context)
    {
        SyntaxToken? typeIdentifier = context.Node.Parent switch
        {
            // When the parent is a class declaration, this parameterlist is a primary constructor
            ClassDeclarationSyntax @class => @class.Identifier,
            // When the parent is a constructor declaration, it's a normal constructor
            ConstructorDeclarationSyntax constructor => constructor.Identifier,
            _ => null,
        };

        if (typeIdentifier is null)
            return;

        var enumerableType = GetIEnumerableSymbol(context);
        if (enumerableType is null)
            return;

        var appImplementableTypesReferenced = new Dictionary<Location, (ITypeSymbol Symbol, CSharpSyntaxNode Syntax)>(
            4
        );
        var node = (ParameterListSyntax)context.Node;

        var constructorComments = node.GetLeadingTrivia().ToFullString();

        foreach (var parameter in node.Parameters)
        {
            var identifier = parameter.Type;
            if (identifier is null)
                continue;

            Process(context, identifier, appImplementableTypesReferenced, enumerableType);
        }

        if (context.Node.Parent is ConstructorDeclarationSyntax constructorDeclaration)
        {
            if (constructorDeclaration.Body is not null)
            {
                var identifiers = constructorDeclaration.Body.DescendantNodes().OfType<IdentifierNameSyntax>();
                foreach (var identifier in identifiers)
                {
                    Process(context, identifier, appImplementableTypesReferenced, enumerableType);
                }
            }
        }

        foreach (var reference in appImplementableTypesReferenced)
        {
            var diagnostic = Diagnostic.Create(
                Diagnostics.DangerousConstructorInjection,
                reference.Key,
                reference.Value.Symbol.Name,
                typeIdentifier.Value.ValueText
            );
            var referenceComments = reference.Value.Syntax.GetLeadingTrivia().ToFullString();

            if (
                constructorComments.IndexOf("altinn:injection:ignore", StringComparison.Ordinal) != -1
                || referenceComments.IndexOf("altinn:injection:ignore", StringComparison.Ordinal) != -1
            )
                return;

            context.ReportDiagnostic(diagnostic);
        }

        static void Process(
            SyntaxNodeAnalysisContext context,
            ExpressionSyntax syntax,
            Dictionary<Location, (ITypeSymbol Symbol, CSharpSyntaxNode Syntax)> typesReferenced,
            INamedTypeSymbol enumerableType
        )
        {
            if (syntax is PredefinedTypeSyntax)
                return;

            var typeInfo =
                context.SemanticModel.GetSymbolInfo(syntax, context.CancellationToken).Symbol as INamedTypeSymbol;
            if (typeInfo is null)
                return;
            if (typeInfo.IsGenericType && _comparer.Equals(typeInfo.ConstructUnboundGenericType(), enumerableType))
            {
                var enumerableTypeArgument = typeInfo.TypeArguments.FirstOrDefault();
                if (enumerableTypeArgument is ITypeParameterSymbol typeParameterSymbol)
                    enumerableTypeArgument = GetMostRelevantConstraintType(typeParameterSymbol);
                if (enumerableTypeArgument is not INamedTypeSymbol innerType)
                    return;
                typeInfo = innerType;
            }
            if (typeInfo.TypeKind != TypeKind.Interface)
                return;
            var key = syntax.GetLocation();
            if (typesReferenced.ContainsKey(key))
                return;
            if (!IsMarkedWithAttribute(typeInfo))
                return;

            typesReferenced.Add(key, (typeInfo, syntax));
        }
    }

    private static bool IsMarkedWithAttribute(ITypeSymbol symbol)
    {
        var attributes = symbol.GetAttributes();
        foreach (var attribute in attributes)
        {
            if (attribute.AttributeClass?.Name == MarkerAttributeName)
                return true;
        }

        return false;
    }

    private static INamedTypeSymbol? GetAppImplementationFactoryInvocationTypeArgument(
        SyntaxNodeAnalysisContext context,
        INamedTypeSymbol appImplementationFactoryType,
        // Some method invocation syntax on the `AppImplementationFactory` type
        // e.g. `GetRequired<T>()`
        InvocationExpressionSyntax invocation
    )
    {
        TypeArgumentListSyntax? typeArgumentList = null;
        var typeArgumentLists = invocation.DescendantNodes().OfType<TypeArgumentListSyntax>().ToArray();
        if (typeArgumentLists.Length == 0)
            return null;
        if (typeArgumentLists.Length == 1)
        {
            typeArgumentList = typeArgumentLists[0];
        }
        else
        {
            var factoryMethods = appImplementationFactoryType
                .GetMembers()
                .Where(m =>
                    m is IMethodSymbol method && !method.IsStatic && !method.IsAbstract && method.IsGenericMethod
                )
                .Cast<IMethodSymbol>()
                .ToArray();
            foreach (var typeArgumentListSyntax in typeArgumentLists)
            {
                if (typeArgumentListSyntax.Parent is not NameSyntax methodName)
                    continue;
                if (context.SemanticModel.GetSymbolInfo(methodName).Symbol is not IMethodSymbol method)
                    continue;
                if (!factoryMethods.Contains(method.OriginalDefinition, _comparer))
                    continue;

                typeArgumentList = typeArgumentListSyntax;
                break;
            }
        }

        if (typeArgumentList is null)
            return null;
        var typeSyntax = typeArgumentList.Arguments.FirstOrDefault();
        if (typeSyntax is null)
            return null;
        return ResolveTypeSyntaxToPotentialAppImplementableType(context, typeSyntax);
    }

    private static INamedTypeSymbol? ResolveTypeSyntaxToPotentialAppImplementableType(
        SyntaxNodeAnalysisContext context,
        TypeSyntax typeSyntax
    )
    {
        var typeInfoSymbol = context.SemanticModel.GetTypeInfo(typeSyntax, context.CancellationToken).Type;
        if (typeInfoSymbol is ITypeParameterSymbol typeParameterSymbol)
            typeInfoSymbol = GetMostRelevantConstraintType(typeParameterSymbol);

        if (typeInfoSymbol is not INamedTypeSymbol symbol)
            return null;

        return symbol;
    }

    private static ITypeSymbol? GetMostRelevantConstraintType(ITypeParameterSymbol typeParameterSymbol)
    {
        // If the type is a type parameter (T), we just take the first constraint type
        // that is marked by the attribute or fallback to the first constraint type
        // if none is marked with the attribute.
        if (typeParameterSymbol.ConstraintTypes.Length == 0)
            return null;

        for (int i = 0; i < typeParameterSymbol.ConstraintTypes.Length; i++)
        {
            var constraintType = typeParameterSymbol.ConstraintTypes[i];
            if (IsMarkedWithAttribute(constraintType))
                return constraintType;
        }

        return typeParameterSymbol.ConstraintTypes[0];
    }

    private static INamedTypeSymbol? GetIEnumerableSymbol(SyntaxNodeAnalysisContext context)
    {
        var enumerableType = context
            .SemanticModel.Compilation.GetTypeByMetadataName("System.Collections.Generic.IEnumerable`1")
            ?.ConstructUnboundGenericType();

        return enumerableType;
    }

    private static INamedTypeSymbol? GetIServiceProviderSymbol(SyntaxNodeAnalysisContext context)
    {
        var serviceProviderType = context.SemanticModel.Compilation.GetTypeByMetadataName("System.IServiceProvider");
        return serviceProviderType;
    }

    private static INamedTypeSymbol? GetAppImplementationFactorySymbol(SyntaxNodeAnalysisContext context)
    {
        var appImplementationFactoryType = context.SemanticModel.Compilation.GetTypeByMetadataName(
            "Altinn.App.Core.Features.AppImplementationFactory"
        );
        return appImplementationFactoryType;
    }
}
