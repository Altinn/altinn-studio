using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Exceptions.DataModeling;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services;

public class ModelNameValidatorTests
{
    private const string TypeName = "model";
    private const string OtherDataTypeId = "existing";

    private readonly ModelNameValidator _validator = new(
        TestDataHelper.XmlSchemaToJsonSchemaConverter,
        TestDataHelper.ModelMetadataToCsharpConverter,
        new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory())
    );

    [Theory]
    [InlineData("Altinn.App.Models.model")]
    [InlineData("Altinn.App.Models.model.model")]
    public void ValidateTypeNameForNewModel_ClassOfAnotherDataType_ThrowsWithTheClassAndTheDataType(string classRef)
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(classRef);

        var exception = Assert.Throws<ModelWithTheSameBaseTypeAlreadyExists>(() =>
            _validator.ValidateTypeNameForNewModel(applicationMetadata, TypeName)
        );

        Assert.Contains(classRef, exception.Message);
        Assert.Contains($"'{OtherDataTypeId}'", exception.Message);
    }

    [Theory]
    [InlineData("Altinn.App.Models.model2")]
    [InlineData("Altinn.App.Models.other.model")]
    public void ValidateTypeNameForNewModel_ClassThatNoDataTypeHas_DoesNotThrow(string classRef)
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(classRef);

        _validator.ValidateTypeNameForNewModel(applicationMetadata, TypeName);
    }

    // The data type without app logic is like the PDF data type that every app has.
    private static ApplicationMetadata CreateApplicationMetadata(string classRef) =>
        new("ttd/app")
        {
            DataTypes =
            [
                new DataType { Id = "ref-data-as-pdf" },
                new DataType
                {
                    Id = OtherDataTypeId,
                    AppLogic = new ApplicationLogic { ClassRef = classRef },
                },
            ],
        };
}
