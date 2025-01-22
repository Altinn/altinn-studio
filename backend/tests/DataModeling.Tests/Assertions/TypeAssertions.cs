using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Reflection;
using Altinn.Studio.DataModeling.Converter.Csharp;
using Xunit;

namespace DataModeling.Tests.Assertions;

[ExcludeFromCodeCoverage]
public static class TypeAssertions
{
    public static void IsEquivalentTo(Type expected, Type actual)
    {
        if (expected.IsPrimitive || expected == typeof(string) || expected == typeof(DateTime) || expected == typeof(decimal))
        {
            Assert.Equal(expected, actual);
            return;
        }

        Assert.Equal(expected.Name, actual.Name);
        Assert.Equal(expected.Namespace, actual.Namespace);
        Assert.Equal(expected.IsArray, actual.IsArray);
        Assert.Equal(expected.IsClass, actual.IsClass);
        Assert.Equal(expected.IsGenericType, actual.IsGenericType);
        if (expected.IsGenericType)
        {
            foreach (var expectedArg in expected.GenericTypeArguments)
            {
                var actualArg = actual.GenericTypeArguments.Single(x => x.Name == expectedArg.Name);
                IsEquivalentTo(expectedArg, actualArg);
            }
        }

        if (expected.IsClass && !expected.IsGenericType)
        {
            IsEquivalentTo(expected.GetFields(), actual.GetFields());
            IsEquivalentTo(expected.GetProperties(), actual.GetProperties());
            IsEquivalentTo(expected.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly), actual.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly));
        }

        IsEquivalentTo(expected.Attributes, actual.Attributes);
        IsEquivalentTo(expected.CustomAttributes, actual.CustomAttributes);
    }

    private static void IsEquivalentTo(IReadOnlyCollection<FieldInfo> expected, IReadOnlyCollection<FieldInfo> actual)
    {
        Assert.Equal(expected.Count, actual.Count);
        foreach (var expectedItem in expected)
        {
            var actualItem = actual.Single(x => x.Name == expectedItem.Name);
            IsEquivalentTo(expectedItem, actualItem);
        }
    }

    private static void IsEquivalentTo(FieldInfo expected, FieldInfo actual)
    {
        Assert.Equal(expected.Name, actual.Name);
        IsEquivalentTo(expected.FieldType, actual.FieldType);
        IsEquivalentTo(expected.CustomAttributes, actual.CustomAttributes);
        Assert.Equal(expected.IsPrivate, actual.IsPrivate);
        Assert.Equal(expected.IsPublic, actual.IsPublic);
    }

    private static void IsEquivalentTo(IReadOnlyCollection<PropertyInfo> expected, IReadOnlyCollection<PropertyInfo> actual)
    {
        Assert.Equal(expected.Count, actual.Count);
        foreach (var expectedItem in expected)
        {
            var actualItem = actual.Single(x => x.Name == expectedItem.Name);
            IsEquivalentTo(expectedItem, actualItem);
        }
    }

    private static void IsEquivalentTo(PropertyInfo expected, PropertyInfo actual)
    {
        Assert.Equal(expected.Name, actual.Name);
        IsEquivalentTo(expected.PropertyType, actual.PropertyType);
        IsEquivalentTo(expected.CustomAttributes, actual.CustomAttributes);
    }

    private static void IsEquivalentTo(IEnumerable<CustomAttributeData> expected, IEnumerable<CustomAttributeData> actual)
    {
        var expectedStrings = expected.Select(e => e.ToString());
        var actualStrings = actual.Select(a => a.ToString());
        Assert.True(expectedStrings.SequenceEqual(actualStrings));
    }

    private static void IsEquivalentTo(TypeAttributes expected, TypeAttributes actual)
    {
        Assert.Equal(expected, actual);
    }

    private static void IsEquivalentTo(IReadOnlyCollection<MethodInfo> expected, IReadOnlyCollection<MethodInfo> actual)
    {
        Assert.Equal(expected.Count, actual.Count);
        foreach (var expectedItem in expected)
        {
            var actualItem = actual.Single(x => x.Name == expectedItem.Name);
            IsEquivalentTo(expectedItem, actualItem);
        }
    }

    private static void IsEquivalentTo(MethodInfo expected, MethodInfo actual)
    {
        Assert.Equal(expected.Name, actual.Name);
        IsEquivalentTo(expected.ReturnType, actual.ReturnType);
        Assert.Equal(expected.IsPublic, actual.IsPublic);
    }

    public static void PropertyShouldContainCustomAnnotationAndHaveTypeType(Type type, string propertyName, string propertyType, string expectedAnnotationString)
    {
        var property = type.GetProperties().Single(x => x.Name == propertyName);
        var simpleCompiledAssembly = Compiler.CompileToAssembly(DynamicAnnotationClassString(propertyName, propertyType, expectedAnnotationString));
        var expectedProperty = simpleCompiledAssembly.GetTypes()
            .First(x => x.Name == "DynamicAnnotationClass").GetProperties().Single();
        IsEquivalentTo(expectedProperty.PropertyType, property.PropertyType);
        var expectedAnnotation = expectedProperty.CustomAttributes.Single();
        Assert.Single(property.CustomAttributes, x => x.ToString() == expectedAnnotation.ToString());
    }

    private static string DynamicAnnotationClassString(string propertyName, string propertyType, string annotation) =>
        $@"
            using System;
            using System.ComponentModel.DataAnnotations;
            namespace TextAnnotationClassProp
            {{
                public class DynamicAnnotationClass
                {{
                    {annotation}
                    public {propertyType} {propertyName} {{ get; set; }}
                }}
            }}
         ";
}
