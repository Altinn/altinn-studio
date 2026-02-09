using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Models;

public class DataElementIdentifierTests
{
    [Fact]
    public void NullableDataElementIdentifier_Default_ShouldBeNull()
    {
        DataElementIdentifier? identifier = default;

        Assert.True(identifier is null);
        Assert.False(identifier.HasValue);
    }

    [Fact]
    public void NullableDataElementIdentifier_Null_ShouldBeNull()
    {
        DataElementIdentifier? identifier = null;

        Assert.True(identifier is null);
        Assert.False(identifier.HasValue);
    }

    [Fact]
    public void NullableDataElementIdentifier_FromNullDataElement_ShouldBeNull()
    {
        DataElement? dataElement = null;
        DataElementIdentifier? identifier = dataElement;

        Assert.True(identifier is null);
        Assert.False(identifier.HasValue);
    }

    [Fact]
    public void NullableDataElementIdentifier_FromDataElement_ShouldHaveValue()
    {
        var guid = Guid.NewGuid();
        DataElement dataElement = new() { Id = guid.ToString(), DataType = "Model" };
        DataElementIdentifier? identifier = dataElement;

        Assert.True(identifier.HasValue);
        Assert.Equal(guid, identifier.Value.Guid);
        Assert.Equal(guid.ToString(), identifier.Value.Id);
        Assert.Equal("Model", identifier.Value.DataTypeId);
    }

    [Fact]
    public void DataElementIdentifier_FromNullDataElement_ShouldThrowNullReferenceException()
    {
        DataElement? dataElement = null;

        // The non-nullable implicit operator doesn't guard against null input,
        // so it throws NullReferenceException when accessing dataElement.Id
        Assert.Throws<NullReferenceException>(() =>
        {
            DataElementIdentifier identifier = dataElement!;
        });
    }

    [Fact]
    public void DataElementIdentifier_FromDataElement_ShouldWork()
    {
        var guid = Guid.NewGuid();
        DataElement dataElement = new() { Id = guid.ToString(), DataType = "Model" };
        DataElementIdentifier identifier = dataElement;

        Assert.Equal(guid, identifier.Guid);
        Assert.Equal(guid.ToString(), identifier.Id);
        Assert.Equal("Model", identifier.DataTypeId);
    }

    [Fact]
    public void DataElementIdentifier_FromString_ShouldWork()
    {
        var guid = Guid.NewGuid();
        var identifier = new DataElementIdentifier(guid.ToString());

        Assert.Equal(guid, identifier.Guid);
        Assert.Equal(guid.ToString(), identifier.Id);
        Assert.Null(identifier.DataTypeId);
    }

    [Fact]
    public void DataElementIdentifier_FromGuid_ShouldWork()
    {
        var guid = Guid.NewGuid();
        var identifier = new DataElementIdentifier(guid);

        Assert.Equal(guid, identifier.Guid);
        Assert.Equal(guid.ToString(), identifier.Id);
        Assert.Null(identifier.DataTypeId);
    }

    [Fact]
    public void DataElementIdentifier_Equality_ShouldCompareByGuid()
    {
        var guid = Guid.NewGuid();
        var identifier1 = new DataElementIdentifier(guid);
        var identifier2 = new DataElementIdentifier(guid.ToString());

        Assert.True(identifier1 == identifier2);
        Assert.True(identifier1.Equals(identifier2));
        Assert.Equal(identifier1.GetHashCode(), identifier2.GetHashCode());
    }

    [Fact]
    public void DataElementIdentifier_Inequality_ShouldCompareByGuid()
    {
        var identifier1 = new DataElementIdentifier(Guid.NewGuid());
        var identifier2 = new DataElementIdentifier(Guid.NewGuid());

        Assert.True(identifier1 != identifier2);
        Assert.False(identifier1.Equals(identifier2));
    }

    [Fact]
    public void DataElementIdentifier_ToString_ShouldReturnId()
    {
        var guid = Guid.NewGuid();
        var identifier = new DataElementIdentifier(guid);

        Assert.Equal(guid.ToString(), identifier.ToString());
    }
}
