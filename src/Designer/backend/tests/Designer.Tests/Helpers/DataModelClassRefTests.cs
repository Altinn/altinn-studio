using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Exceptions.DataModeling;
using Altinn.Studio.Designer.Helpers;
using Xunit;

namespace Designer.Tests.Helpers;

public class DataModelClassRefTests
{
    private const string TypeName = "model";
    private const string OtherDataTypeId = "existing";
    private const string ReplacedDataTypeId = "replaced";

    [Theory]
    [InlineData("Altinn.App.Models.model")]
    [InlineData("Altinn.App.Models.model.model")]
    public void ThrowIfAnotherDataTypeHasClass_ClassOfAnotherDataType_Throws(string classRef)
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(classRef);

        Assert.Throws<ModelWithTheSameBaseTypeAlreadyExists>(() =>
            DataModelClassRef.ThrowIfAnotherDataTypeHasClass(applicationMetadata, TypeName, replacedDataTypeId: null)
        );
    }

    [Theory]
    [InlineData("Altinn.App.Models.model2")]
    [InlineData("Altinn.App.Models.other.model")]
    public void ThrowIfAnotherDataTypeHasClass_ClassThatNoDataTypeHas_DoesNotThrow(string classRef)
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(classRef);

        DataModelClassRef.ThrowIfAnotherDataTypeHasClass(applicationMetadata, TypeName, replacedDataTypeId: null);
    }

    [Fact]
    public void ThrowIfAnotherDataTypeHasClass_ClassOfTheReplacedDataType_DoesNotThrow()
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata("Altinn.App.Models.model.model");

        DataModelClassRef.ThrowIfAnotherDataTypeHasClass(applicationMetadata, TypeName, OtherDataTypeId);
    }

    [Fact]
    public void ThrowIfAnotherDataTypeHasClass_ClassOfAnotherDataTypeThanTheReplacedOne_Throws()
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(
            DataModelType(ReplacedDataTypeId, "Altinn.App.Models.old.old"),
            DataModelType(OtherDataTypeId, "Altinn.App.Models.model.model")
        );

        Assert.Throws<ModelWithTheSameBaseTypeAlreadyExists>(() =>
            DataModelClassRef.ThrowIfAnotherDataTypeHasClass(applicationMetadata, TypeName, ReplacedDataTypeId)
        );
    }

    [Theory]
    [InlineData("Altinn.App.Models.model")]
    [InlineData("Altinn.App.Models.model.model")]
    public void ThrowIfAnotherDataTypeHasClass_ClassThatAnotherDataTypeSharesWithTheReplacedOne_DoesNotThrow(
        string classRef
    )
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(
            DataModelType(ReplacedDataTypeId, classRef),
            DataModelType(OtherDataTypeId, classRef)
        );

        DataModelClassRef.ThrowIfAnotherDataTypeHasClass(applicationMetadata, TypeName, ReplacedDataTypeId);
    }

    [Fact]
    public void ThrowIfAnotherDataTypeHasClass_NoDataTypes_DoesNotThrow()
    {
        ApplicationMetadata applicationMetadata = new("ttd/app");

        DataModelClassRef.ThrowIfAnotherDataTypeHasClass(applicationMetadata, TypeName, replacedDataTypeId: null);
    }

    [Fact]
    public void Get_ClassInTheSharedNamespace_KeepsTheSharedNamespace()
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata("Altinn.App.Models.model");

        Assert.False(DataModelClassRef.HasOwnNamespace(applicationMetadata, TypeName));
        Assert.Equal("Altinn.App.Models.model", DataModelClassRef.Get(applicationMetadata, TypeName));
    }

    [Theory]
    [InlineData("Altinn.App.Models.model.model")]
    [InlineData("Altinn.App.Models.other")]
    public void Get_ClassNotInTheSharedNamespace_GetsANamespaceOfItsOwn(string classRef)
    {
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(classRef);

        Assert.True(DataModelClassRef.HasOwnNamespace(applicationMetadata, TypeName));
        Assert.Equal("Altinn.App.Models.model.model", DataModelClassRef.Get(applicationMetadata, TypeName));
    }

    [Fact]
    public void Get_NoDataTypes_GetsANamespaceOfItsOwn()
    {
        ApplicationMetadata applicationMetadata = new("ttd/app");

        Assert.Equal("Altinn.App.Models.model.model", DataModelClassRef.Get(applicationMetadata, TypeName));
    }

    private static ApplicationMetadata CreateApplicationMetadata(string classRef) =>
        CreateApplicationMetadata(DataModelType(OtherDataTypeId, classRef));

    // The data type without app logic is like the PDF data type that every app has.
    private static ApplicationMetadata CreateApplicationMetadata(params DataType[] dataModelTypes) =>
        new("ttd/app") { DataTypes = [new DataType { Id = "ref-data-as-pdf" }, .. dataModelTypes] };

    private static DataType DataModelType(string id, string classRef) =>
        new()
        {
            Id = id,
            AppLogic = new ApplicationLogic { ClassRef = classRef },
        };
}
