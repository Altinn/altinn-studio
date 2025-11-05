#nullable disable
using System.IO;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.App.Core.Models;
using Altinn.Studio.DataModeling.Converter.Interfaces;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Metadata;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Exceptions.DataModeling;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Json.Schema;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ModelNameValidator : IModelNameValidator
{
    private readonly IXmlSchemaToJsonSchemaConverter _xmlSchemaToJsonSchemaConverter;
    private readonly IModelMetadataToCsharpConverter _modelMetadataToCsharpConverter;
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    public ModelNameValidator(IXmlSchemaToJsonSchemaConverter xmlSchemaToJsonSchemaConverter, IModelMetadataToCsharpConverter modelMetadataToCsharpConverter, IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _xmlSchemaToJsonSchemaConverter = xmlSchemaToJsonSchemaConverter;
        _modelMetadataToCsharpConverter = modelMetadataToCsharpConverter;
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }


    public async Task ValidateModelNameForNewXsdSchemaAsync(Stream xsdSchema, string fileName, AltinnRepoEditingContext altinnRepoEditingContext)
    {
        var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

        AltinnStudioSettings altinnStudioSettings = await repository.GetAltinnStudioSettings();
        if (altinnStudioSettings.RepoType != AltinnRepositoryType.App)
        {
            return;
        }

        // Try to go through conversion all the way.
        // This will enforce either all files are written to disk or none if there is an error.
        ModelMetadata modelMetadata = TestE2EConversion(xsdSchema, altinnStudioSettings);


        string modelName = modelMetadata.GetRootElement().TypeName;

        if (!repository.ApplicationMetadataExists())
        {
            return;
        }

        var applicationMetadata = await repository.GetApplicationMetadata();

        bool fileExistsByRelativePath = repository.FileExistsByRelativePath(Path.Combine(repository.GetRelativeModelFolder(), fileName));

        bool alreadyHasTypeName = CheckIfAppAlreadyHasTypeName(applicationMetadata, modelName);

        if (!fileExistsByRelativePath && alreadyHasTypeName)
        {
            throw new ModelWithTheSameBaseTypeAlreadyExists();
        }
    }

    private ModelMetadata TestE2EConversion(Stream xsdSchema, AltinnStudioSettings altinnStudioSettings)
    {
        using XmlReader xmlReader = XmlReader.Create(xsdSchema);
        var xmlSchema = XmlSchema.Read(xmlReader, (_, _) => { });
        xsdSchema.Seek(0, SeekOrigin.Begin);
        var jsonSchema = _xmlSchemaToJsonSchemaConverter.Convert(xmlSchema);
        var jsonSchemaConverterStrategy = JsonSchemaConverterStrategyFactory.SelectStrategy(jsonSchema);
        var metamodelConverter = new JsonSchemaToMetamodelConverter(jsonSchemaConverterStrategy.GetAnalyzer());
        var modelMetadata = metamodelConverter.Convert(SerializeJsonSchema(jsonSchema));
        _modelMetadataToCsharpConverter.CreateModelFromMetadata(modelMetadata, separateNamespaces: false, altinnStudioSettings.UseNullableReferenceTypes);
        return modelMetadata;
    }

    public async Task ValidateModelNameForNewJsonSchemaAsync(string modelName, AltinnRepoEditingContext altinnRepoEditingContext)
    {
        var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

        if (!repository.ApplicationMetadataExists())
        {
            return;
        }

        var applicationMetadata = await repository.GetApplicationMetadata();

        bool alreadyHasTypeName = CheckIfAppAlreadyHasTypeName(applicationMetadata, modelName);

        if (alreadyHasTypeName)
        {
            throw new ModelWithTheSameBaseTypeAlreadyExists();
        }
    }

    private bool CheckIfAppAlreadyHasTypeName(ApplicationMetadata metadata, string modelName)
    {
        return metadata.DataTypes.Any(d => d.AppLogic?.ClassRef == $"Altinn.App.Models.{modelName}"
                                           || d.AppLogic?.ClassRef == $"Altinn.App.Models.{modelName}.{modelName}");
    }

    private string SerializeJsonSchema(JsonSchema jsonSchema)
    {
        return JsonSerializer.Serialize(jsonSchema, new JsonSerializerOptions()
        {
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement)
        });
    }
}
