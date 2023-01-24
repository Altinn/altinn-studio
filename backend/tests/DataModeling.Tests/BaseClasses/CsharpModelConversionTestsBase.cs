﻿using System.Reflection;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using Altinn.Studio.DataModeling.Converter.Csharp;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Metadata;
using Altinn.Studio.DataModeling.Metamodel;
using SharedResources.Tests;

namespace DataModeling.Tests.BaseClasses
{
    public class CsharpModelConversionTestsBase<TTestType> : SchemaConversionTestsBase<TTestType>
        where TTestType : CsharpModelConversionTestsBase<TTestType>
    {
        protected ModelMetadata ModelMetadata { get; set; }

        protected string CSharpClasses { get; set; }

        protected Assembly CompiledAssembly { get; set; }

        protected TTestType ConvertedJsonSchemaConvertedToModelMetadata()
        {
            var strategy = JsonSchemaConverterStrategyFactory.SelectStrategy(ConvertedJsonSchema);
            var metamodelConverter = new JsonSchemaToMetamodelConverter(strategy.GetAnalyzer());

            string jsonSchemaString = JsonSerializer.Serialize(ConvertedJsonSchema, new JsonSerializerOptions()
            {
                Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
                WriteIndented = true
            });

            ModelMetadata = metamodelConverter.Convert(jsonSchemaString);
            return this as TTestType;
        }

        protected TTestType LoadedJsonSchemaConvertedToModelMetadata()
        {
            var strategy = JsonSchemaConverterStrategyFactory.SelectStrategy(LoadedJsonSchema);
            var metamodelConverter = new JsonSchemaToMetamodelConverter(strategy.GetAnalyzer());

            string jsonSchemaString = JsonSerializer.Serialize(LoadedJsonSchema, new JsonSerializerOptions()
            {
                Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
                WriteIndented = true
            });

            ModelMetadata = metamodelConverter.Convert(jsonSchemaString);
            return this as TTestType;
        }

        protected TTestType ModelMetadataConvertedToCsharpClass()
        {
            CSharpClasses = new JsonMetadataToCsharpConverter(new CSharpGenerationSettings()).CreateModelFromMetadata(ModelMetadata);
            return this as TTestType;
        }

        protected TTestType CSharpClassesCompiledToAssembly()
        {
            CompiledAssembly = Compiler.CompileToAssembly(CSharpClasses);
            return this as TTestType;
        }
    }
}
