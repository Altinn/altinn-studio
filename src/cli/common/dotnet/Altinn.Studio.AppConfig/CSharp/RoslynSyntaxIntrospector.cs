using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.Studio.AppConfig.CSharp;

internal sealed class RoslynSyntaxIntrospector
{
    public void Introspect(AppModelBuilder app, IAppDirectory dir)
    {
        const string appDir = "App";
        if (!dir.DirectoryExists(appDir))
            return;
        foreach (var file in dir.EnumerateFiles(appDir, "*.cs", recursive: true))
        {
            var data = dir.ReadAllBytes(file);
            if (data is null)
                continue;
            var tree = CSharpSyntaxTree.ParseText(System.Text.Encoding.UTF8.GetString(data));
            var root = tree.GetRoot();
            OptionProviderScanner.Collect(root, app);
            foreach (var typeDecl in root.DescendantNodes().OfType<BaseTypeDeclarationSyntax>())
            {
                RecordType(app, typeDecl, file);
            }
        }
    }

    private static void RecordType(AppModelBuilder app, BaseTypeDeclarationSyntax decl, string file)
    {
        var name = decl.Identifier.ValueText;
        var ns = ResolveNamespace(decl);
        var fqn = string.IsNullOrEmpty(ns) ? name : ns + "." + name;
        app.CSharpClasses[fqn] = true;
        app.CSharpClasses[name] = true;

        if (decl is TypeDeclarationSyntax td)
        {
            var props = new List<ModelProperty>();
            foreach (var member in td.Members.OfType<PropertyDeclarationSyntax>())
            {
                var pname = member.Identifier.ValueText;
                var typeRef = ToTypeRef(member.Type);
                var attrs = member
                    .AttributeLists.SelectMany(al => al.Attributes)
                    .Select(a => a.Name.ToString())
                    .ToList()
                    .AsReadOnly();
                props.Add(new ModelProperty(pname, typeRef, attrs, SpanOf(member, file), JsonNameOf(member) ?? pname));
            }
            app.CSharpModel[fqn] = new ModelTypeInfo(fqn, props.AsReadOnly(), SpanOf(td, file, td.Identifier.Span));
        }
    }

    private static string ResolveNamespace(SyntaxNode node)
    {
        var parts = new List<string>();
        for (var p = node.Parent; p is not null; p = p.Parent)
        {
            switch (p)
            {
                case BaseNamespaceDeclarationSyntax ns:
                    parts.Insert(0, ns.Name.ToString());
                    break;
            }
        }
        return string.Join(".", parts);
    }

    private static ModelTypeRef ToTypeRef(TypeSyntax t)
    {
        switch (t)
        {
            case ArrayTypeSyntax arr:
                return new ModelTypeRef("array", CollectionKind.Array, ToTypeRef(arr.ElementType));
            case NullableTypeSyntax nullable:
                return ToTypeRef(nullable.ElementType);
            case GenericNameSyntax gen:
            {
                var baseName = gen.Identifier.ValueText;
                var args = gen.TypeArgumentList.Arguments;
                if (args.Count == 1)
                {
                    var inner = ToTypeRef(args[0]);
                    switch (baseName)
                    {
                        case "List":
                        case "IList":
                        case "ICollection":
                        case "ReadOnlyCollection":
                        case "IReadOnlyList":
                        case "IReadOnlyCollection":
                            return new ModelTypeRef(baseName, CollectionKind.List, inner);
                        case "IEnumerable":
                            return new ModelTypeRef(baseName, CollectionKind.Enumerable, inner);
                    }
                }
                return new ModelTypeRef(gen.ToString(), CollectionKind.Scalar, null);
            }
            default:
                return new ModelTypeRef(t.ToString(), CollectionKind.Scalar, null);
        }
    }

    private static string? JsonNameOf(PropertyDeclarationSyntax member)
    {
        foreach (var a in member.AttributeLists.SelectMany(al => al.Attributes))
        {
            if (
                a.Name.ToString() is "JsonPropertyName" or "JsonPropertyNameAttribute"
                && a.ArgumentList is { Arguments.Count: > 0 }
                && a.ArgumentList.Arguments[0].Expression is LiteralExpressionSyntax lit
                && lit.Token.Value is string v
            )
                return v;
        }
        return null;
    }

    private static SourceSpan SpanOf(SyntaxNode n, string file) => SpanOf(n, file, n.Span);

    private static SourceSpan SpanOf(SyntaxNode anchor, string file, TextSpan span)
    {
        var text = anchor.SyntaxTree.GetText();
        var ls = anchor.SyntaxTree.GetLineSpan(span);
        return new SourceSpan(
            file,
            "",
            ls.StartLinePosition.Line + 1,
            ByteColumn(text, ls.StartLinePosition),
            ls.EndLinePosition.Line + 1,
            ByteColumn(text, ls.EndLinePosition)
        );
    }

    private static int ByteColumn(SourceText text, LinePosition pos)
    {
        var line = text.Lines[pos.Line];
        var take = Math.Min(pos.Character, line.End - line.Start);
        return System.Text.Encoding.UTF8.GetByteCount(text.ToString(new TextSpan(line.Start, take))) + 1;
    }
}
