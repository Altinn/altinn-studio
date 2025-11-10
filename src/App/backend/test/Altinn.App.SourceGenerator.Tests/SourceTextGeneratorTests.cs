using System.Reflection;
using System.Text;
using System.Text.Json.Serialization;
using Altinn.App.Analyzers;
using Altinn.App.Analyzers.SourceTextGenerator;
using Xunit.Abstractions;

namespace Altinn.App.SourceGenerator.Tests;

public class SourceTextGeneratorTests(ITestOutputHelper outputHelper)
{
    [Fact]
    public async Task Generate()
    {
        var rootNode = GetRoot<Skjema>();

        var text = SourceTextGenerator.GenerateSourceText(rootNode);
        outputHelper.WriteLine(AddLineNumbers(text));

        await Verify(text, extension: "cs");
    }

    [Fact]
    public async Task GenerateEmpty()
    {
        var rootNode = GetRoot<Empty>();

        var text = SourceTextGenerator.GenerateSourceText(rootNode);
        outputHelper.WriteLine(AddLineNumbers(text));

        await Verify(text, extension: "cs");
    }

    private string AddLineNumbers(string text)
    {
        var lines = text.Split('\n');
        var bytes = 0;
        var sb = new StringBuilder();
        for (int i = 0; i < lines.Length; i++)
        {
            sb.Append($"{i + 1, 4} {$"({bytes})", -6}: {lines[i]}\n");
            bytes += lines[i].Length + 1;
        }
        return sb.ToString();
    }

    private ModelPathNode GetRoot<T>()
    {
        var children = typeof(T).GetProperties().Select(GetFromType).ToArray();
        return new ModelPathNode("", "", "global::" + typeof(T).FullName!, children);
    }

    private ModelPathNode GetFromType(PropertyInfo propertyInfo)
    {
        var propertyType = propertyInfo.PropertyType;
        var cSharpName = propertyInfo.Name;
        var jsonPath = propertyInfo.GetCustomAttribute<JsonPropertyNameAttribute>()?.Name ?? cSharpName;

        var collectionInterface = propertyType.GetInterface("System.Collections.Generic.ICollection`1");

        if (collectionInterface != null)
        {
            var typeParam = collectionInterface.GetGenericArguments()[0];
            var typeString = FullTypeName(typeParam);
            var listType = $"{FullTypeName(propertyType.GetGenericTypeDefinition())}<{typeString}>";
            var children = GetChildren(typeParam);

            return new ModelPathNode(cSharpName, jsonPath, typeString, children, listType: listType);
        }
        else
        {
            var typeString = FullTypeName(propertyType);
            var children = GetChildren(propertyType);

            return new ModelPathNode(cSharpName, jsonPath, typeString, children);
        }
    }

    private static string FullTypeName(Type typeParam)
    {
        if (typeParam.Name == "Nullable`1")
        {
            typeParam = typeParam.GenericTypeArguments[0];
        }
        return "global::" + typeParam.FullName?.Replace("`1", "");
    }

    private ModelPathNode[]? GetChildren(Type propertyType)
    {
        // Unwrap nullable
        if (propertyType.Name == "Nullable`1")
        {
            propertyType = propertyType.GenericTypeArguments[0];
        }
        if (FormDataWrapperUtils.IsJsonValueType(propertyType.Namespace, propertyType.Name))
        {
            return null;
        }
        var properties = propertyType.GetProperties();
        var children = properties.Select(GetFromType).ToArray();
        return children;
    }
}
