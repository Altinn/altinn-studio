using System.Text.Json;
using Altinn.App.Core.Features.Testing;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Enums;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Features.Testing;

public class MockDataHelperTests
{
    private readonly IMockDataHelper _mockDataHelper;

    public MockDataHelperTests()
    {
        _mockDataHelper = new MockDataHelper();
    }

    [Fact]
    public void Should_Merge_UserProfile_Properties()
    {
        // Arrange
        var realProfile = new UserProfile
        {
            UserId = 1337,
            UserName = "testuser",
            PhoneNumber = "12345678",
            Email = "original@test.com",
            PartyId = 501337,
            UserType = UserType.SSNIdentified,
            ProfileSettingPreference = new ProfileSettingPreference
            {
                Language = "nb",
                PreSelectedPartyId = 501337,
                DoNotPromptForParty = false,
            },
        };

        var mockData = new { email = "mocked@test.com", phoneNumber = "87654321" };

        // Act
        var result = _mockDataHelper.MergeUserProfile(realProfile, mockData);

        // Assert
        Assert.Equal("mocked@test.com", result.Email);
        Assert.Equal("87654321", result.PhoneNumber);
        Assert.Equal(1337, result.UserId); // Unchanged
        Assert.Equal("testuser", result.UserName); // Unchanged
        Assert.Equal(UserType.SSNIdentified, result.UserType); // Unchanged
    }

    [Fact]
    public void Should_Preserve_Unmocked_UserProfile_Fields()
    {
        // Arrange
        var realProfile = new UserProfile
        {
            UserId = 1337,
            UserName = "testuser",
            PhoneNumber = "12345678",
            Email = "original@test.com",
            PartyId = 501337,
        };

        var mockData = new { email = "mocked@test.com" }; // Only mock email

        // Act
        var result = _mockDataHelper.MergeUserProfile(realProfile, mockData);

        // Assert
        Assert.Equal("mocked@test.com", result.Email); // Mocked
        Assert.Equal("12345678", result.PhoneNumber); // Preserved
        Assert.Equal(1337, result.UserId); // Preserved
        Assert.Equal("testuser", result.UserName); // Preserved
    }

    [Fact]
    public void Should_Handle_Null_Mock_Data_Gracefully()
    {
        // Arrange
        var realProfile = new UserProfile { UserId = 1337, Email = "original@test.com" };

        // Act
        var result = _mockDataHelper.MergeUserProfile(realProfile, null);

        // Assert
        Assert.Equal(1337, result.UserId);
        Assert.Equal("original@test.com", result.Email);
    }

    [Fact]
    public void Should_Merge_Nested_Objects()
    {
        // Arrange
        var realProfile = new UserProfile
        {
            UserId = 1337,
            ProfileSettingPreference = new ProfileSettingPreference
            {
                Language = "nb",
                PreSelectedPartyId = 501337,
                DoNotPromptForParty = false,
            },
        };

        var mockData = new
        {
            profileSettingPreference = new
            {
                language = "en",
                doNotPromptForParty = true,
                // preSelectedPartyId not included, should be preserved
            },
        };

        // Act
        var result = _mockDataHelper.MergeUserProfile(realProfile, mockData);

        // Assert
        Assert.Equal("en", result.ProfileSettingPreference?.Language);
        Assert.True(result.ProfileSettingPreference?.DoNotPromptForParty);
        Assert.Equal(501337, result.ProfileSettingPreference?.PreSelectedPartyId); // Preserved
    }

    [Fact]
    public void Should_Merge_Party_Arrays()
    {
        // Arrange
        var realParties = new List<Party>
        {
            new Party
            {
                PartyId = 501337,
                Name = "Real Organization A",
                PartyTypeName = PartyType.Organisation,
            },
            new Party
            {
                PartyId = 501338,
                Name = "Real Organization B",
                PartyTypeName = PartyType.Organisation,
            },
        };

        var mockData = new object[]
        {
            new { partyId = 501337, name = "Mocked Organization A" },
            new { partyId = 501339, name = "New Mocked Organization C" },
        };

        // Act
        var result = _mockDataHelper.MergeParties(realParties, mockData);

        // Assert
        Assert.Equal(3, result.Count);

        // First party should be merged
        var party1 = result.FirstOrDefault(p => p.PartyId == 501337);
        Assert.NotNull(party1);
        Assert.Equal("Mocked Organization A", party1.Name);
        Assert.Equal(PartyType.Organisation, party1.PartyTypeName); // Preserved

        // Second party should be unchanged
        var party2 = result.FirstOrDefault(p => p.PartyId == 501338);
        Assert.NotNull(party2);
        Assert.Equal("Real Organization B", party2.Name);

        // Third party should be new
        var party3 = result.FirstOrDefault(p => p.PartyId == 501339);
        Assert.NotNull(party3);
        Assert.Equal("New Mocked Organization C", party3.Name);
    }

    [Fact]
    public void Should_Override_Specific_ApplicationMetadata_Fields()
    {
        // Arrange
        var realMetadata = new ApplicationMetadata("test/app")
        {
            PromptForParty = "never",
            OnEntry = new OnEntry { Show = "new-instance" },
            DataTypes = new List<DataType>
            {
                new DataType
                {
                    Id = "model",
                    AllowedContentTypes = new List<string> { "application/xml" },
                },
            },
        };

        var mockData = new
        {
            promptForParty = "always",
            onEntry = new { show = "select-instance" },
            // dataTypes not mocked, should be preserved
        };

        // Act
        var result = _mockDataHelper.MergeApplicationMetadata(realMetadata, mockData);

        // Assert
        Assert.Equal("always", result.PromptForParty);
        Assert.Equal("select-instance", result.OnEntry?.Show);
        Assert.Single(result.DataTypes); // Preserved
        Assert.Equal("model", result.DataTypes[0].Id); // Preserved
    }

    [Fact]
    public void Should_Handle_Type_Mismatches_Safely()
    {
        // Arrange
        var realProfile = new UserProfile { UserId = 1337, Email = "original@test.com" };

        var mockData = new
        {
            userId = "invalid-number", // Wrong type
            email = "mocked@test.com", // Correct type
        };

        // Act
        var result = _mockDataHelper.MergeUserProfile(realProfile, mockData);

        // Assert
        Assert.Equal(1337, result.UserId); // Should be preserved (conversion failed)
        Assert.Equal("mocked@test.com", result.Email); // Should be merged (conversion succeeded)
    }

    [Fact]
    public void Should_Support_Array_Element_Updates()
    {
        // Arrange
        var realInstances = new List<Instance>
        {
            new Instance
            {
                Id = "501337/guid1",
                InstanceOwner = new InstanceOwner { PartyId = "501337" },
                Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            },
        };

        var mockData = new object[]
        {
            new
            {
                id = "501337/guid1",
                process = new
                {
                    currentTask = new { elementId = "Task_2" },
                    // Other process fields should be preserved
                },
            },
        };

        // Act
        var result = _mockDataHelper.MergeInstances(realInstances, mockData);

        // Assert
        Assert.Single(result);
        Assert.Equal("501337/guid1", result[0].Id);
        Assert.Equal("Task_2", result[0].Process?.CurrentTask?.ElementId);
        Assert.Equal("501337", result[0].InstanceOwner?.PartyId); // Preserved
    }

    [Fact]
    public void Should_Use_Generic_MergeObject_Method()
    {
        // Arrange
        var realData = new UserProfile { UserId = 1337, Email = "original@test.com" };

        var mockData = new { email = "mocked@test.com" };

        // Act
        var result = _mockDataHelper.MergeObject(realData, mockData);

        // Assert
        Assert.Equal("mocked@test.com", result.Email);
        Assert.Equal(1337, result.UserId);
    }
}
