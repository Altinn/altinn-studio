using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Exceptions.DataModeling;
using Altinn.Studio.Designer.Helpers;
using Xunit;

namespace Designer.Tests.Helpers;

public class DataModelClassRefTests
{
    private const string TypeName = "model";

    [Theory]
    [InlineData("Altinn.App.Models.model")]
    [InlineData("Altinn.App.Models.model.model")]
    public void ThrowIfAnotherDataTypeHasClass_ClassOfADataType_Throws(string classRef)
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(classRef);

        Assert.Throws<ModelWithTheSameBaseTypeAlreadyExists>(() =>
            DataModelClassRef.ThrowIfAnotherDataTypeHasClass(applicationMetadata, TypeName)
        );
    }

    [Theory]
    [InlineData("Altinn.App.Models.model2")]
    [InlineData("Altinn.App.Models.other.model")]
    public void ThrowIfAnotherDataTypeHasClass_ClassThatNoDataTypeHas_DoesNotThrow(string classRef)
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(classRef);

        DataModelClassRef.ThrowIfAnotherDataTypeHasClass(applicationMetadata, TypeName);
    }

    [Fact]
    public void ThrowIfAnotherDataTypeHasClass_NoDataTypes_DoesNotThrow()
    {
        ApplicationMetadata applicationMetadata = new("ttd/app");

        DataModelClassRef.ThrowIfAnotherDataTypeHasClass(applicationMetadata, TypeName);
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
                    Id = "existing",
                    AppLogic = new ApplicationLogic { ClassRef = classRef },
                },
            ],
        };
}
