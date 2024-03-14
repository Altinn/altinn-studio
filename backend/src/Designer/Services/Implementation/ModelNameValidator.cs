using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Interfaces;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Metadata;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Exceptions.DataModeling;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

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

    public async Task ValidateModelNameForNewXsdSchema(Stream xsdSchema, string fileName, AltinnRepoEditingContext altinnRepoEditingContext)
    {
        await Task.CompletedTask;
        // Try to go through conversion all the way.
        // This will enforce either all files are written to disk or none if there is an error.
        using XmlReader xmlReader = XmlReader.Create(xsdSchema);
        var xmlSchema = XmlSchema.Read(xmlReader, (_, _) => { });
        xsdSchema.Seek(0, SeekOrigin.Begin);
        var jsonSchema = _xmlSchemaToJsonSchemaConverter.Convert(xmlSchema);
        var jsonSchemaConverterStrategy = JsonSchemaConverterStrategyFactory.SelectStrategy(jsonSchema);
        var metamodelConverter = new JsonSchemaToMetamodelConverter(jsonSchemaConverterStrategy.GetAnalyzer());
        var modelMetadata = metamodelConverter.Convert(SerializeJsonSchema(jsonSchema));
        _modelMetadataToCsharpConverter.CreateModelFromMetadata(modelMetadata);


        string modelName = modelMetadata.GetRootElement().TypeName;

        var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
        var applicationMetadata = await repository.GetApplicationMetadata();

        bool fileExistsByRelativePath = repository.FileExistsByRelativePath(Path.Combine(repository.GetRelativeModelFolder(), fileName));

        bool alreadyHasTypeName =
            applicationMetadata.DataTypes.Any(d => d.AppLogic?.ClassRef == $"Altinn.App.Models.{modelName}"
                                                   || d.AppLogic?.ClassRef == $"Altinn.App.Models.{modelName}.{modelName}");

        if (!fileExistsByRelativePath && alreadyHasTypeName)
        {
            throw new ModelWithTheSameBaseTypeAlreadyExists();
        }
    }

    public Task ValidateModelNameForNewJsonSchema(JsonNode jsonSchema, string fileName,
        AltinnRepoEditingContext altinnRepoEditingContext) =>
        throw new System.NotImplementedException();


    private string SerializeJsonSchema(Json.Schema.JsonSchema jsonSchema)
    {
        return JsonSerializer.Serialize(jsonSchema, new JsonSerializerOptions()
        {
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Create(System.Text.Unicode.UnicodeRanges.BasicLatin, System.Text.Unicode.UnicodeRanges.Latin1Supplement)
        });
    }
}
