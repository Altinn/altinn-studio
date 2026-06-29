using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowCallbackStateTests
{
    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_PreservesInstance()
    {
        // Arrange
        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance
            {
                Org = "ttd",
                AppId = "ttd/test-app",
                InstanceOwner = new InstanceOwner { PartyId = "501337" },
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo { ElementId = "Task_1", AltinnTaskType = "data" },
                },
            },
            FormData = new List<FormDataEntry>(),
        };

        // Act
        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal("ttd", deserialized.Instance.Org);
        Assert.Equal("ttd/test-app", deserialized.Instance.AppId);
        Assert.NotNull(deserialized.Instance.InstanceOwner);
        Assert.Equal("501337", deserialized.Instance.InstanceOwner.PartyId);
        Assert.NotNull(deserialized.Instance.Process);
        Assert.NotNull(deserialized.Instance.Process.CurrentTask);
        Assert.Equal("Task_1", deserialized.Instance.Process.CurrentTask.ElementId);
        Assert.Equal("data", deserialized.Instance.Process.CurrentTask.AltinnTaskType);
    }

    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_PreservesFormData()
    {
        // Arrange
        var formDataObject = new
        {
            Name = "John Doe",
            Age = 42,
            Active = true,
        };
        var dataElement = JsonSerializer.SerializeToElement(formDataObject);

        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance { Org = "ttd", AppId = "ttd/test-app" },
            FormData = new List<FormDataEntry>
            {
                new FormDataEntry
                {
                    Id = "data-guid-1",
                    DataType = "model",
                    Data = dataElement,
                },
            },
        };

        // Act
        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Single(deserialized.FormData);

        var entry = deserialized.FormData[0];
        Assert.Equal("data-guid-1", entry.Id);
        Assert.Equal("model", entry.DataType);
        Assert.Equal("John Doe", entry.Data.GetProperty("Name").GetString());
        Assert.Equal(42, entry.Data.GetProperty("Age").GetInt32());
        Assert.True(entry.Data.GetProperty("Active").GetBoolean());
    }

    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_MultipleDataElements()
    {
        // Arrange
        var data1 = JsonSerializer.SerializeToElement(new { Field1 = "value1" });
        var data2 = JsonSerializer.SerializeToElement(new { Field2 = 100, Nested = new { Inner = "deep" } });
        var data3 = JsonSerializer.SerializeToElement(new int[] { 1, 2, 3 });

        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance { Org = "ttd", AppId = "ttd/test-app" },
            FormData = new List<FormDataEntry>
            {
                new FormDataEntry
                {
                    Id = "guid-1",
                    DataType = "mainModel",
                    Data = data1,
                },
                new FormDataEntry
                {
                    Id = "guid-2",
                    DataType = "subform",
                    Data = data2,
                },
                new FormDataEntry
                {
                    Id = "guid-3",
                    DataType = "arrayModel",
                    Data = data3,
                },
            },
        };

        // Act
        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal(3, deserialized.FormData.Count);

        Assert.Equal("guid-1", deserialized.FormData[0].Id);
        Assert.Equal("mainModel", deserialized.FormData[0].DataType);
        Assert.Equal("value1", deserialized.FormData[0].Data.GetProperty("Field1").GetString());

        Assert.Equal("guid-2", deserialized.FormData[1].Id);
        Assert.Equal("subform", deserialized.FormData[1].DataType);
        Assert.Equal(100, deserialized.FormData[1].Data.GetProperty("Field2").GetInt32());
        Assert.Equal("deep", deserialized.FormData[1].Data.GetProperty("Nested").GetProperty("Inner").GetString());

        Assert.Equal("guid-3", deserialized.FormData[2].Id);
        Assert.Equal("arrayModel", deserialized.FormData[2].DataType);
        Assert.Equal(JsonValueKind.Array, deserialized.FormData[2].Data.ValueKind);
        Assert.Equal(3, deserialized.FormData[2].Data.GetArrayLength());
        Assert.Equal(1, deserialized.FormData[2].Data[0].GetInt32());
        Assert.Equal(2, deserialized.FormData[2].Data[1].GetInt32());
        Assert.Equal(3, deserialized.FormData[2].Data[2].GetInt32());
    }

    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_EmptyFormData()
    {
        // Arrange
        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance
            {
                Org = "ttd",
                AppId = "ttd/test-app",
                Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
            },
            FormData = new List<FormDataEntry>(),
        };

        // Act
        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.NotNull(deserialized.FormData);
        Assert.Empty(deserialized.FormData);
        Assert.Equal("ttd", deserialized.Instance.Org);
        Assert.Equal("ttd/test-app", deserialized.Instance.AppId);
        Assert.NotNull(deserialized.Instance.Process);
        Assert.Equal("Task_2", deserialized.Instance.Process.CurrentTask?.ElementId);
    }

    [Fact]
    public void WorkflowCallbackState_SerializeDeserialize_PreservesDataElementsOnInstance()
    {
        // Arrange
        var instanceState = new WorkflowCallbackState
        {
            Instance = new Instance
            {
                Org = "ttd",
                AppId = "ttd/test-app",
                Data = new List<DataElement>
                {
                    new DataElement
                    {
                        Id = "de-guid-1",
                        DataType = "model",
                        ContentType = "application/json",
                    },
                    new DataElement
                    {
                        Id = "de-guid-2",
                        DataType = "attachment",
                        ContentType = "application/pdf",
                    },
                },
            },
            FormData = new List<FormDataEntry>(),
        };

        // Act
        string json = JsonSerializer.Serialize(instanceState);
        var deserialized = JsonSerializer.Deserialize<WorkflowCallbackState>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.NotNull(deserialized.Instance.Data);
        Assert.Equal(2, deserialized.Instance.Data.Count);

        Assert.Equal("de-guid-1", deserialized.Instance.Data[0].Id);
        Assert.Equal("model", deserialized.Instance.Data[0].DataType);
        Assert.Equal("application/json", deserialized.Instance.Data[0].ContentType);

        Assert.Equal("de-guid-2", deserialized.Instance.Data[1].Id);
        Assert.Equal("attachment", deserialized.Instance.Data[1].DataType);
        Assert.Equal("application/pdf", deserialized.Instance.Data[1].ContentType);
    }
}
