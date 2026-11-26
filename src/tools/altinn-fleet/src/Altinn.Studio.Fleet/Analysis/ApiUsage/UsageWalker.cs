using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Fleet.Analysis.ApiUsage;

/// <summary>Reports each app library symbol a syntax tree binds to, with how the code uses it.</summary>
/// <remarks>
/// A name binds to a type or member, so asking the semantic model about every name, creation, attribute and operator
/// finds the uses. Some code calls members it does not name, such as <c>foreach</c>, <c>await</c>, deconstruction,
/// positional patterns, collection initializers, query expressions, casts to a conversion operator and a constructor's
/// call of the base class's constructor, so those ask the semantic model what they bind to. A type declaration adds
/// what it inherits, implements and overrides, since an app that implements an interface depends on all of its
/// members, called or not.
/// </remarks>
internal sealed class UsageWalker(SemanticModel model, Action<ISymbol, string, Location> report) : CSharpSyntaxWalker
{
    public override void DefaultVisit(SyntaxNode node)
    {
        switch (node)
        {
            case BaseTypeDeclarationSyntax declaration:
                ReportDeclaration(declaration);
                break;
            case SimpleNameSyntax
            or ObjectCreationExpressionSyntax
            or ImplicitObjectCreationExpressionSyntax
            or AttributeSyntax
            or BinaryExpressionSyntax
            or PrefixUnaryExpressionSyntax
            or PostfixUnaryExpressionSyntax
            or AssignmentExpressionSyntax
            or ElementAccessExpressionSyntax
            or ConstructorInitializerSyntax
            or PrimaryConstructorBaseTypeSyntax
            or SelectOrGroupClauseSyntax
            or OrderingSyntax:
                ReportBound(node);
                break;
        }

        ReportImplicit(node);

        // A constructor without : base(...) or : this(...) calls the base class's constructor without naming it.
        if (
            node is ConstructorDeclarationSyntax { Initializer: null } constructor
            && !constructor.Modifiers.Any(SyntaxKind.StaticKeyword)
            && model.GetOperation(constructor) is IConstructorBodyOperation body
        )
        {
            ReportBaseCall(body, constructor.Identifier.GetLocation());
        }

        if (node is ExpressionSyntax expression && model.GetConversion(expression).MethodSymbol is { } conversion)
        {
            Report(conversion, UseKinds.Conversion, node.GetLocation());
        }

        // A cast's own conversion is the cast's operation, not a conversion of the expression.
        if (
            node is CastExpressionSyntax
            && model.GetOperation(node) is IConversionOperation { OperatorMethod: { } explicitConversion }
        )
        {
            Report(explicitConversion, UseKinds.Conversion, node.GetLocation());
        }

        base.DefaultVisit(node);
    }

    private void ReportBound(SyntaxNode node)
    {
        SymbolInfo info = model.GetSymbolInfo(node);
        ISymbol? symbol = info.Symbol ?? (info.CandidateSymbols.Length > 0 ? info.CandidateSymbols[0] : null);
        if (symbol is null or INamespaceSymbol)
        {
            return;
        }

        Report(symbol, KindOf(symbol, node), node.GetLocation());
    }

    /// <summary>Reports the members that code calls without naming them.</summary>
    private void ReportImplicit(SyntaxNode node)
    {
        Location location = node.GetLocation();
        switch (node)
        {
            case CommonForEachStatementSyntax forEach:
                ForEachStatementInfo info = model.GetForEachStatementInfo(forEach);
                ReportMember(info.GetEnumeratorMethod, location);
                ReportMember(info.MoveNextMethod, location);
                ReportMember(info.CurrentProperty, location);
                ReportMember(info.DisposeMethod, location);
                if (forEach is ForEachVariableStatementSyntax variables)
                {
                    ReportDeconstruction(model.GetDeconstructionInfo(variables), location);
                }

                break;
            case AwaitExpressionSyntax awaitExpression:
                AwaitExpressionInfo awaited = model.GetAwaitExpressionInfo(awaitExpression);
                ReportMember(awaited.GetAwaiterMethod, location);
                ReportMember(awaited.IsCompletedProperty, location);
                ReportMember(awaited.GetResultMethod, location);
                break;
            case AssignmentExpressionSyntax { Left: TupleExpressionSyntax or DeclarationExpressionSyntax } assignment:
                ReportDeconstruction(model.GetDeconstructionInfo(assignment), location);
                break;
            case InitializerExpressionSyntax initializer
                when initializer.IsKind(SyntaxKind.CollectionInitializerExpression):
                foreach (ExpressionSyntax element in initializer.Expressions)
                {
                    ReportMember(model.GetCollectionInitializerSymbolInfo(element).Symbol, element.GetLocation());
                }

                break;
            case RecursivePatternSyntax { PositionalPatternClause: not null } pattern
                when model.GetOperation(pattern) is IRecursivePatternOperation recursive:
                ReportMember(recursive.DeconstructSymbol, location);
                break;
            case QueryClauseSyntax clause:
                QueryClauseInfo query = model.GetQueryClauseInfo(clause);
                ReportMember(query.OperationInfo.Symbol, location);
                ReportMember(query.CastInfo.Symbol, location);
                break;
        }
    }

    private void ReportDeconstruction(DeconstructionInfo deconstruction, Location location)
    {
        ReportMember(deconstruction.Method, location);
        foreach (DeconstructionInfo nested in deconstruction.Nested)
        {
            ReportDeconstruction(nested, location);
        }
    }

    private void ReportMember(ISymbol? symbol, Location location)
    {
        if (symbol is not null)
        {
            // An extension method such as a Deconstruct or GetAwaiter extension is recorded as its declaration.
            Report(symbol, symbol is IPropertySymbol ? UseKinds.Access : UseKinds.Call, location);
        }
    }

    private static string KindOf(ISymbol symbol, SyntaxNode node) =>
        symbol switch
        {
            INamedTypeSymbol => UseKinds.Type,
            IMethodSymbol { MethodKind: MethodKind.Constructor } => node is AttributeSyntax
                ? UseKinds.Attribute
                : UseKinds.Construct,
            IMethodSymbol { MethodKind: MethodKind.UserDefinedOperator or MethodKind.Conversion } => UseKinds.Operator,
            IMethodSymbol => UseKinds.Call,
            IPropertySymbol or IFieldSymbol => UseKinds.Access,
            IEventSymbol => UseKinds.Event,
            _ => symbol.Kind.ToString().ToLowerInvariant(),
        };

    private void ReportDeclaration(BaseTypeDeclarationSyntax declaration)
    {
        if (model.GetDeclaredSymbol(declaration) is not INamedTypeSymbol type)
        {
            return;
        }

        // A partial type is reported once, from its first declaration: the app's own, ahead of generated parts.
        if (type.DeclaringSyntaxReferences[0].GetSyntax() != declaration)
        {
            return;
        }

        Location location = declaration.Identifier.GetLocation();
        if (type.BaseType is { } baseType && LibrarySymbols.IsLibrary(baseType))
        {
            Report(baseType, UseKinds.Inherit, location);
            if (
                declaration is TypeDeclarationSyntax typeDeclaration
                && HasBaseCallWithoutSyntax(type, typeDeclaration)
                && ProbeBaseCall(typeDeclaration) is { } body
            )
            {
                ReportBaseCall(body, location);
            }
        }

        foreach (INamedTypeSymbol iface in type.AllInterfaces.Where(LibrarySymbols.IsLibrary))
        {
            Report(iface, UseKinds.Implement, location);
            foreach (ISymbol member in iface.GetMembers())
            {
                // Accessors are reported through their property or event. A static abstract member is implemented like
                // any other, and a static member with a body has no implementation to find.
                if (member is INamedTypeSymbol || member is IMethodSymbol { AssociatedSymbol: not null })
                {
                    continue;
                }

                // The app's code implements it when the implementation is in its source, in this type or in a base
                // class of the app's own, rather than in a library base class.
                ISymbol? implementation = type.FindImplementationForInterfaceMember(member);
                if (implementation is not null && implementation.Locations.Any(l => l.IsInSource))
                {
                    Report(member, UseKinds.Implement, location);
                }
            }
        }

        foreach (ISymbol member in type.GetMembers())
        {
            ISymbol? overridden = member switch
            {
                IMethodSymbol method => method.OverriddenMethod,
                IPropertySymbol property => property.OverriddenProperty,
                IEventSymbol @event => @event.OverriddenEvent,
                _ => null,
            };
            if (overridden is not null && LibrarySymbols.IsLibrary(overridden))
            {
                Report(overridden, UseKinds.Override, location);
            }
        }
    }

    private void ReportBaseCall(IConstructorBodyOperation body, Location location)
    {
        if (body.Initializer is IExpressionStatementOperation { Operation: IInvocationOperation call })
        {
            Report(call.TargetMethod, UseKinds.Construct, location);
        }
    }

    /// <summary>
    /// Whether a class has a constructor that calls its base class's constructor without syntax for the call: one the
    /// compiler writes, or a primary constructor whose base type has no argument list.
    /// </summary>
    private static bool HasBaseCallWithoutSyntax(INamedTypeSymbol type, TypeDeclarationSyntax declaration) =>
        type.TypeKind == TypeKind.Class
        && (
            // A record's copy constructor calls the base's copy constructor, which a record type names.
            type.InstanceConstructors.Any(constructor =>
                constructor.IsImplicitlyDeclared && constructor.Parameters.Length == 0
            )
            || type.DeclaringSyntaxReferences.Select(reference => reference.GetSyntax())
                .OfType<TypeDeclarationSyntax>()
                .Any(part =>
                    part.ParameterList is not null
                    && part.BaseList?.Types.FirstOrDefault() is not PrimaryConstructorBaseTypeSyntax
                )
        );

    /// <summary>
    /// Has the compiler bind the base class constructor call that a class's constructors make without syntax for it.
    /// Such a call binds as <c>: base()</c> does in a constructor of the class, so this adds one to a copy of the
    /// class's declaration and binds that.
    /// </summary>
    private IConstructorBodyOperation? ProbeBaseCall(TypeDeclarationSyntax declaration)
    {
        var annotation = new SyntaxAnnotation();
        // The parameter's type does not exist, so the probe cannot have the signature of a constructor the class has.
        var probe = (ConstructorDeclarationSyntax)
            SyntaxFactory
                .ParseMemberDeclaration(
                    $"{declaration.Identifier.Text}(global::FleetProbe.NoSuchType fleetProbe) : base() {{ }}"
                )!
                .WithAdditionalAnnotations(annotation);
        TypeDeclarationSyntax probed = declaration.OpenBraceToken.IsKind(SyntaxKind.None)
            ? declaration
                .WithOpenBraceToken(SyntaxFactory.Token(SyntaxKind.OpenBraceToken))
                .WithCloseBraceToken(SyntaxFactory.Token(SyntaxKind.CloseBraceToken))
                .WithSemicolonToken(default)
            : declaration;
        SyntaxTree tree = declaration.SyntaxTree;
        SyntaxNode root = tree.GetRoot().ReplaceNode(declaration, probed.AddMembers(probe));
        SyntaxTree probeTree = tree.WithRootAndOptions(root, tree.Options);
        Compilation compilation = model.Compilation.ReplaceSyntaxTree(tree, probeTree);
        SyntaxNode probeNode = probeTree.GetRoot().GetAnnotatedNodes(annotation).Single();
        return compilation.GetSemanticModel(probeTree).GetOperation(probeNode) as IConstructorBodyOperation;
    }

    private void Report(ISymbol symbol, string kind, Location location)
    {
        // A name that did not bind is an error type that claims a library assembly, not a use of the library.
        if (symbol is not IErrorTypeSymbol && LibrarySymbols.IsLibrary(symbol))
        {
            report(symbol, kind, location);
        }
    }
}
