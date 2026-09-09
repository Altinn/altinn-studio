using System.Net.Http.Json;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Integration.Tests;

public partial class AppFixture
{
    private SigningOperations? _signing;
    internal SigningOperations Signing => _signing ??= new SigningOperations(this);

    internal sealed class SigningOperations(AppFixture fixture)
    {
        public Task<ApiResponse> Sign(string token, ReadApiResponse<Instance> instance)
        {
            var model = instance.Data.Model ?? throw new InvalidOperationException("Instance data model is null");
            return fixture.Generic.Post(
                $"{fixture.OriginalAppPath}/instances/{model.Id}/actions",
                token,
                JsonContent.Create(new UserActionRequest { Action = "sign" })
            );
        }

        public Task<ApiResponse> GetState(string token, ReadApiResponse<Instance> instance, string? taskId = null)
        {
            var model = instance.Data.Model ?? throw new InvalidOperationException("Instance data model is null");
            var endpoint = $"{fixture.OriginalAppPath}/instances/{model.Id}/signing";
            if (taskId is not null)
                endpoint += $"?taskId={Uri.EscapeDataString(taskId)}";
            return fixture.Generic.Get(endpoint, token);
        }
    }
}
