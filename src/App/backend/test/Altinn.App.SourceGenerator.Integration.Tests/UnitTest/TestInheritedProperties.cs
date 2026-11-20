using System;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;
using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

/// <summary>
/// <see cref="Complaint"/> inherits "reference" from an abstract class, <see cref="Claimant"/> adds a property to
/// those it inherits, and <see cref="Agent"/> has inherited properties only.
/// </summary>
public class TestInheritedProperties
{
    private static readonly DataType _dataType = new() { Id = "complaint" };

    private readonly Contact _contact = new() { Email = "kari@example.com" };
    private readonly Agent _agent = new() { Name = "Ola" };
    private readonly Claimant _claimant;
    private readonly Complaint _complaint;

    public TestInheritedProperties()
    {
        _claimant = new()
        {
            Role = "owner",
            Name = "Kari",
            Contact = _contact,
        };
        _complaint = new()
        {
            Reference = "2026/17",
            Claimants = [_claimant],
            Agent = _agent,
        };
    }

    private static IFormDataWrapper CreateWrapper(Complaint complaint, bool reflection) =>
        reflection
            ? new ReflectionFormDataWrapper(complaint, _dataType)
            : new Altinn_App_SourceGenerator_Integration_Tests_Models_ComplaintFormDataWrapper(complaint, _dataType);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Get_ReadsInheritedProperties(bool reflection)
    {
        var wrapper = CreateWrapper(_complaint, reflection);

        Assert.Equal("2026/17", wrapper.Get("reference"));
        Assert.Equal("Kari", wrapper.Get("claimants[0].name"));
        Assert.Equal("kari@example.com", wrapper.Get("claimants[0].contact.email"));
        Assert.Equal("Ola", wrapper.Get("agent.name"));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Set_WritesInheritedProperties(bool reflection)
    {
        var claimant = new Claimant();
        var complaint = new Complaint { Claimants = [claimant] };
        var wrapper = CreateWrapper(complaint, reflection);

        Assert.True(wrapper.Set("reference", "2026/17"));
        Assert.True(wrapper.Set("claimants[0].name", "Kari"));
        Assert.True(wrapper.Set("claimants[0].contact.email", "kari@example.com"));
        Assert.True(wrapper.Set("agent.name", "Ola"));

        Assert.Equal("2026/17", complaint.Reference);
        Assert.Equal("Kari", claimant.Name);
        Assert.Equal("kari@example.com", claimant.Contact?.Email);
        Assert.Equal("Ola", complaint.Agent?.Name);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void RemoveField_ClearsInheritedProperties(bool reflection)
    {
        var wrapper = CreateWrapper(_complaint, reflection);

        wrapper.RemoveField("reference", RowRemovalOption.Ignore);
        wrapper.RemoveField("claimants[0].name", RowRemovalOption.Ignore);
        wrapper.RemoveField("claimants[0].contact.email", RowRemovalOption.Ignore);
        wrapper.RemoveField("agent.name", RowRemovalOption.Ignore);

        Assert.Null(_complaint.Reference);
        Assert.Null(_claimant.Name);
        Assert.Null(_contact.Email);
        Assert.Null(_agent.Name);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void AddIndexToPath_ResolvesInheritedProperties(bool reflection)
    {
        var wrapper = CreateWrapper(_complaint, reflection);

        Assert.Equal("reference", wrapper.AddIndexToPath("reference", []));
        Assert.Equal("claimants[2].name", wrapper.AddIndexToPath("claimants.name", [2]));
        Assert.Equal("claimants[2].contact.email", wrapper.AddIndexToPath("claimants.contact.email", [2]));
        Assert.Equal("agent.name", wrapper.AddIndexToPath("agent.name", []));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Copy_KeepsInheritedPropertiesInNewObjects(bool reflection)
    {
        var copy = CreateWrapper(_complaint, reflection).Copy().BackingData<Complaint>();

        Assert.Equivalent(_complaint, copy, strict: true);
        Assert.NotSame(_agent, copy.Agent);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void AltinnRowIds_AreInitializedAndRemovedWhenInherited(bool reflection)
    {
        var wrapper = CreateWrapper(_complaint, reflection);

        wrapper.InitializeAltinnRowIds();
        Assert.NotEqual(Guid.Empty, _claimant.AltinnRowId);

        wrapper.RemoveAltinnRowIds();
        Assert.Equal(Guid.Empty, _claimant.AltinnRowId);
    }
}
