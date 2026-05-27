using System.Reflection;
using System.Reflection.Emit;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Tests.LayoutExpressions.CommonTests;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;

/// <summary>
/// Written by chatGPT
///
/// Creates real C# classes dynamically so that we can use custom classes for our shared tests
/// </summary>
public class DynamicClassBuilder
{
    public static Type CreateClassFromJson(JsonDocument jsonDocument)
    {
        var jsonObject = jsonDocument.RootElement;
        if (jsonObject.ValueKind != JsonValueKind.Object)
        {
            throw new ArgumentException("JsonDocument must be an object at the root level.");
        }

        return CreateClassFromJsonElement(jsonObject, "DynamicClass");
    }

    private static Type CreateClassFromJsonElement(JsonElement jsonObject, string typeName)
    {
        AssemblyName assemblyName = new AssemblyName(typeName + "Assembly");
        AssemblyBuilder assemblyBuilder = AssemblyBuilder.DefineDynamicAssembly(
            assemblyName,
            AssemblyBuilderAccess.Run
        );
        ModuleBuilder moduleBuilder = assemblyBuilder.DefineDynamicModule("MainModule");
        TypeBuilder typeBuilder = moduleBuilder.DefineType(typeName, TypeAttributes.Public);

        foreach (var property in jsonObject.EnumerateObject())
        {
            Type propertyType = GetTypeFromJsonElement(property.Value, property.Name, moduleBuilder);
            CreateProperty(typeBuilder, property.Name, propertyType);
        }

        return typeBuilder.CreateTypeInfo().AsType();
    }

    private static void CreateProperty(TypeBuilder typeBuilder, string propertyName, Type propertyType)
    {
        FieldBuilder fieldBuilder = typeBuilder.DefineField("_" + propertyName, propertyType, FieldAttributes.Private);

        PropertyBuilder propertyBuilder = typeBuilder.DefineProperty(
            propertyName,
            PropertyAttributes.HasDefault,
            propertyType,
            null
        );

        MethodBuilder getPropMthdBldr = typeBuilder.DefineMethod(
            "get_" + propertyName,
            MethodAttributes.Public | MethodAttributes.SpecialName | MethodAttributes.HideBySig,
            propertyType,
            Type.EmptyTypes
        );
        ILGenerator getIl = getPropMthdBldr.GetILGenerator();

        getIl.Emit(OpCodes.Ldarg_0);
        getIl.Emit(OpCodes.Ldfld, fieldBuilder);
        getIl.Emit(OpCodes.Ret);

        MethodBuilder setPropMthdBldr = typeBuilder.DefineMethod(
            "set_" + propertyName,
            MethodAttributes.Public | MethodAttributes.SpecialName | MethodAttributes.HideBySig,
            null,
            new Type[] { propertyType }
        );

        ILGenerator setIl = setPropMthdBldr.GetILGenerator();

        setIl.Emit(OpCodes.Ldarg_0);
        setIl.Emit(OpCodes.Ldarg_1);
        setIl.Emit(OpCodes.Stfld, fieldBuilder);
        setIl.Emit(OpCodes.Ret);

        propertyBuilder.SetGetMethod(getPropMthdBldr);
        propertyBuilder.SetSetMethod(setPropMthdBldr);
    }

    private static Type GetTypeFromJsonElement(JsonElement element, string propertyName, ModuleBuilder moduleBuilder)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.String:
                return typeof(string);
            case JsonValueKind.Number:
                return typeof(double?); // Adjust based on your needs (int, float, etc.)
            case JsonValueKind.True:
            case JsonValueKind.False:
                return typeof(bool?);
            case JsonValueKind.Object:
                return CreateClassFromJsonElement(element, propertyName + "Type");
            case JsonValueKind.Array:
                var arrayType = GetArrayType(element, propertyName, moduleBuilder);
                return typeof(List<>).MakeGenericType(arrayType);
            default:
                return typeof(object);
        }
    }

    private static Type GetArrayType(JsonElement arrayElement, string propertyName, ModuleBuilder moduleBuilder)
    {
        if (arrayElement.GetArrayLength() == 0)
        {
            return typeof(object);
        }

        var firstElement = arrayElement[0];
        return GetTypeFromJsonElement(firstElement, propertyName + "Item", moduleBuilder);
    }

    private static readonly JsonSerializerOptions _options = new JsonSerializerOptions()
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
    };

    public static object DataObjectFromJsonDocument(JsonElement doc)
    {
        var type = CreateClassFromJsonElement(doc, "DynamicClass");

        var instance = doc.Deserialize(
            type,
            _options // Ensure that we error if the created class is missing properties (it only looks at the first item of arrays)
        )!;
        return instance;
    }

    public static IInstanceDataAccessor DataAccessorFromJsonDocument(
        Instance instance,
        JsonElement doc,
        DataElement? dataElement = null
    )
    {
        object data = DataObjectFromJsonDocument(doc);
        var dataAccessor = new InstanceDataAccessorFake(instance, applicationMetadata: null) { { dataElement, data } };
        return dataAccessor;
    }

    public static IInstanceDataAccessor DataAccessorFromJsonDocument(
        Instance instance,
        List<DataModelAndElement> dataModels
    )
    {
        var dataAccessor = new InstanceDataAccessorFake(instance, applicationMetadata: null);
        foreach (var pair in dataModels)
        {
            dataAccessor.Add(pair.DataElement, DataObjectFromJsonDocument(pair.Data));
        }

        return dataAccessor;
    }
}
