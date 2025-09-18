using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Auth;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

#nullable enable

namespace TestApp.Shared;

public static class TestingApis
{
    private static IServiceCollection? _services;

    public static void CaptureServiceCollection(IServiceCollection services)
    {
        _services = services;
    }

    public static WebApplication UseTestingApis(this WebApplication app)
    {
        // AUTH
        app.MapGet(
            "/{org}/{app}/api/testing/authentication/introspection",
            async ([FromServices] IAuthenticationContext authContext) =>
            {
                var authenticated = authContext.Current;
                var dto = await authenticated.ToDto();
                return Results.Json(dto);
            }
        );

        // CONNECTIVITY
        app.MapGet(
            "/{org}/{app}/api/testing/connectivity/pdf",
            async ([FromServices] IHttpClientFactory httpClientFactory, [FromServices] IConfiguration configuration) =>
            {
                try
                {
                    using var httpClient = httpClientFactory.CreateClient();
                    httpClient.Timeout = TimeSpan.FromSeconds(5);

                    // Get PDF service URL from configuration (as set in AppFixture.cs)
                    var pdfServiceUrl =
                        configuration["PlatformSettings:ApiPdf2Endpoint"]
                        ?? throw new Exception("PlatformSettings.ApiPdf2Endpoint not configured");

                    var activeEndpoint = pdfServiceUrl.Replace("/pdf", "/config");

                    var response = await httpClient.GetAsync(activeEndpoint);
                    var content = await response.Content.ReadAsStringAsync();

                    return Results.Json(
                        new ConnectivityResult
                        {
                            Success = response.IsSuccessStatusCode,
                            StatusCode = (int)response.StatusCode,
                            Url = activeEndpoint,
                            ResponseContent = content,
                            Message = response.IsSuccessStatusCode
                                ? "PDF service connectivity verified"
                                : $"PDF service connectivity failed: {response.ReasonPhrase}",
                        }
                    );
                }
                catch (Exception ex)
                {
                    return Results.Json(
                        new ConnectivityResult
                        {
                            Success = false,
                            StatusCode = 0,
                            Url = "unknown",
                            ResponseContent = null,
                            Message = $"PDF service connectivity error: {ex.Message}",
                            Exception = ex.ToString(),
                        }
                    );
                }
            }
        );

        app.MapGet(
            "/{org}/{app}/api/testing/connectivity/localtest",
            async ([FromServices] IHttpClientFactory httpClientFactory, [FromServices] IConfiguration configuration) =>
            {
                try
                {
                    using var httpClient = httpClientFactory.CreateClient();
                    httpClient.Timeout = TimeSpan.FromSeconds(5);

                    // Get localtest URL from configuration
                    var localtestBaseUrl =
                        configuration["PlatformSettings:ApiStorageEndpoint"]
                        ?? throw new Exception("PlatformSettings.ApiStorageEndpoint not configured");

                    // Extract base URL and construct health endpoint
                    var baseUri = new Uri(localtestBaseUrl);
                    var healthEndpoint = $"{baseUri.Scheme}://{baseUri.Authority}/health";

                    var response = await httpClient.GetAsync(healthEndpoint);
                    var content = await response.Content.ReadAsStringAsync();

                    return Results.Json(
                        new ConnectivityResult
                        {
                            Success = response.IsSuccessStatusCode,
                            StatusCode = (int)response.StatusCode,
                            Url = healthEndpoint,
                            ResponseContent = content,
                            Message = response.IsSuccessStatusCode
                                ? "Localtest health endpoint connectivity verified"
                                : $"Localtest health endpoint connectivity failed: {response.ReasonPhrase}",
                        }
                    );
                }
                catch (Exception ex)
                {
                    return Results.Json(
                        new ConnectivityResult
                        {
                            Success = false,
                            StatusCode = 0,
                            Url = "unknown",
                            ResponseContent = null,
                            Message = $"Localtest health endpoint connectivity error: {ex.Message}",
                            Exception = ex.ToString(),
                        }
                    );
                }
            }
        );

        // HOSTEDSERVICES
        if (_services is null)
        {
            throw new InvalidOperationException(
                "Service collection not captured. Ensure CaptureServiceCollection is called during service registration"
            );
        }
        app.MapGet(
            "/{org}/{app}/api/testing/hostedservices",
            async ([FromServices] IServiceProvider serviceProvider) =>
            {
                var hostedServices = serviceProvider.GetServices<IHostedService>().ToArray();
                var hostedServicesDescriptors = _services!
                    .Where(sd => sd.ServiceType == typeof(IHostedService))
                    .Select(
                        (sd, i) =>
                            new
                            {
                                IsImplementationFactory = sd.ImplementationFactory is not null,
                                IsImplementationType = sd.ImplementationType is not null,
                                IsImplementationInstance = sd.ImplementationInstance is not null,
                                Lifetime = sd.Lifetime,
                                MaterializedType = hostedServices[i].GetType().FullName,
                            }
                    )
                    .ToArray();
                return Results.Json(hostedServicesDescriptors);
            }
        );

        // AUTHZ
        // Minimal API endpoints that should be protected by scopes
        app.MapGet(
                "/{org}/{app}/api/testing/authorization/metadata",
                ([FromServices] IServiceProvider serviceProvider) =>
                {
                    var service =
                        serviceProvider.GetRequiredService<Altinn.App.Api.Infrastructure.Middleware.ScopeAuthorizationService>();

                    return Results.Ok(
                        new { hasDefinedCustomScopes = service.HasDefinedCustomScopes, metadata = service.Metadata }
                    );
                }
            )
            .WithName("API testing - GET - metadata");

        // GET endpoint with instanceGuid - should be protected with read scope
        app.MapGet(
                "/{org}/{app}/api/testing/authorization/{instanceGuid:guid}",
                (Guid instanceGuid) => Results.Ok(new { instanceGuid })
            )
            .WithName("API testing - GET - instanceGuid");

        // POST endpoint with instanceGuid - should be protected with write scope
        app.MapPost(
                "/{org}/{app}/api/testing/authorization/{instanceGuid:guid}",
                (Guid instanceGuid, object data) => Results.Ok(new { instanceGuid })
            )
            .WithName("API testing - POST - instanceGuid");

        // GET endpoint with instanceOwnerPartyId - should be protected with read scope
        app.MapGet(
                "/{org}/{app}/api/testing/authorization/{instanceOwnerPartyId:int}",
                (int instanceOwnerPartyId) => Results.Ok(new { instanceOwnerPartyId })
            )
            .WithName("API testing - GET - instanceOwnerPartyId");

        // POST endpoint with instanceOwnerPartyId - should be protected with write scope
        app.MapPost(
                "/{org}/{app}/api/testing/authorization/{instanceOwnerPartyId:int}",
                (int instanceOwnerPartyId) => Results.Ok(new { instanceOwnerPartyId })
            )
            .WithName("API testing - POST - instanceOwnerPartyId");

        // Anonymous endpoint - should NOT be protected
        app.MapGet(
                "/{org}/{app}/api/testing/authorization/public",
                () => Results.Ok(new { message = "public endpoint" })
            )
            .AllowAnonymous()
            .WithName("API testing - GET - public");

        return app;
    }
}

public static class AuthenticatedDtoExtensions
{
    public static async Task<AuthenticatedDto> ToDto(this Authenticated authenticated)
    {
        return authenticated switch
        {
            Authenticated.None none => await none.ToDto(),
            Authenticated.User user => await user.ToDto(),
            Authenticated.Org org => await org.ToDto(),
            Authenticated.ServiceOwner serviceOwner => await serviceOwner.ToDto(),
            Authenticated.SystemUser systemUser => await systemUser.ToDto(),
            _ => throw new InvalidOperationException($"Unknown authenticated type: {authenticated.GetType().Name}"),
        };
    }

    public static Task<NoneDto> ToDto(this Authenticated.None none)
    {
        return Task.FromResult(
            new NoneDto
            {
                TokenIssuer = none.TokenIssuer.ToString(),
                TokenIsExchanged = none.TokenIsExchanged,
                Scopes = none.Scopes.ToString(),
                ClientId = none.ClientId,
                Token = ScrubToken(none.Token),
            }
        );
    }

    public static async Task<UserDto> ToDto(this Authenticated.User user)
    {
        var dto = new UserDto
        {
            TokenIssuer = user.TokenIssuer.ToString(),
            TokenIsExchanged = user.TokenIsExchanged,
            Scopes = user.Scopes.ToString(),
            ClientId = user.ClientId,
            Token = ScrubToken(user.Token),
            UserId = user.UserId,
            Username = user.Username,
            UserPartyId = user.UserPartyId,
            SelectedPartyId = user.SelectedPartyId,
            AuthenticationLevel = user.AuthenticationLevel,
            AuthenticationMethod = user.AuthenticationMethod,
            InAltinnPortal = user.InAltinnPortal,
            IsSelfIdentified = user.IsSelfIdentified,
        };

        try
        {
            var details = await user.LoadDetails(validateSelectedParty: false);
            dto.Details = new UserDetailsDto
            {
                UserParty = details.UserParty.ToDto(),
                SelectedParty = details.SelectedParty.ToDto(),
                Profile = details.Profile.ToDto(),
                RepresentsSelf = details.RepresentsSelf,
                Parties = details.Parties.Select(p => p.ToDto()).ToList(),
                PartiesAllowedToInstantiate = details.PartiesAllowedToInstantiate.Select(p => p.ToDto()).ToList(),
                CanRepresent = details.CanRepresent,
            };
        }
        catch (Exception ex)
        {
            dto.DetailsError = $"Failed to load details: {ex.ToString()}";
        }

        return dto;
    }

    public static async Task<OrgDto> ToDto(this Authenticated.Org org)
    {
        var dto = new OrgDto
        {
            TokenIssuer = org.TokenIssuer.ToString(),
            TokenIsExchanged = org.TokenIsExchanged,
            Scopes = org.Scopes.ToString(),
            ClientId = org.ClientId,
            Token = ScrubToken(org.Token),
            OrgNo = org.OrgNo,
            AuthenticationLevel = org.AuthenticationLevel,
            AuthenticationMethod = org.AuthenticationMethod,
        };

        try
        {
            var details = await org.LoadDetails();
            dto.Details = new OrgDetailsDto { Party = details.Party.ToDto(), CanInstantiate = details.CanInstantiate };
        }
        catch (Exception ex)
        {
            dto.DetailsError = $"Failed to load details: {ex.ToString()}";
        }

        return dto;
    }

    public static async Task<ServiceOwnerDto> ToDto(this Authenticated.ServiceOwner serviceOwner)
    {
        var dto = new ServiceOwnerDto
        {
            TokenIssuer = serviceOwner.TokenIssuer.ToString(),
            TokenIsExchanged = serviceOwner.TokenIsExchanged,
            Scopes = serviceOwner.Scopes.ToString(),
            ClientId = serviceOwner.ClientId,
            Token = ScrubToken(serviceOwner.Token),
            Name = serviceOwner.Name,
            OrgNo = serviceOwner.OrgNo,
            AuthenticationLevel = serviceOwner.AuthenticationLevel,
            AuthenticationMethod = serviceOwner.AuthenticationMethod,
        };

        try
        {
            var details = await serviceOwner.LoadDetails();
            dto.Details = new ServiceOwnerDetailsDto { Party = details.Party.ToDto() };
        }
        catch (Exception ex)
        {
            dto.DetailsError = $"Failed to load details: {ex.ToString()}";
        }

        return dto;
    }

    public static async Task<SystemUserDto> ToDto(this Authenticated.SystemUser systemUser)
    {
        var dto = new SystemUserDto
        {
            TokenIssuer = systemUser.TokenIssuer.ToString(),
            TokenIsExchanged = systemUser.TokenIsExchanged,
            Scopes = systemUser.Scopes.ToString(),
            ClientId = systemUser.ClientId,
            Token = ScrubToken(systemUser.Token),
            SystemUserId = systemUser.SystemUserId.ToList(),
            SystemUserOrgNr = systemUser.SystemUserOrgNr.ToString(),
            SupplierOrgNr = systemUser.SupplierOrgNr.ToString(),
            SystemId = systemUser.SystemId,
            AuthenticationLevel = systemUser.AuthenticationLevel,
            AuthenticationMethod = systemUser.AuthenticationMethod,
        };

        try
        {
            var details = await systemUser.LoadDetails();
            dto.Details = new SystemUserDetailsDto
            {
                Party = details.Party.ToDto(),
                CanInstantiate = details.CanInstantiate,
            };
        }
        catch (Exception ex)
        {
            dto.DetailsError = $"Failed to load details: {ex.ToString()}";
        }

        return dto;
    }

    public static PartyDto ToDto(this Party party)
    {
        return new PartyDto
        {
            PartyId = party.PartyId,
            PartyTypeName = party.PartyTypeName.ToString(),
            PartyUuid = party.PartyUuid,
            SSN = party.SSN,
            OrgNumber = party.OrgNumber,
            UnitType = party.UnitType,
            Name = party.Name,
            IsDeleted = party.IsDeleted,
            OnlyHierarchyElementWithNoAccess = party.OnlyHierarchyElementWithNoAccess,
            Person = party.Person?.ToDto(),
            Organization = party.Organization?.ToDto(),
            ChildParties = party.ChildParties?.Select(cp => cp.ToDto()).ToList(),
        };
    }

    public static PersonDto? ToDto(this Person? person)
    {
        if (person == null)
            return null;

        return new PersonDto
        {
            SSN = person.SSN,
            Name = person.Name,
            FirstName = person.FirstName,
            MiddleName = person.MiddleName,
            LastName = person.LastName,
            TelephoneNumber = person.TelephoneNumber,
            MobileNumber = person.MobileNumber,
            MailingAddress = person.MailingAddress,
            MailingPostalCode = person.MailingPostalCode,
            MailingPostalCity = person.MailingPostalCity,
            AddressHouseLetter = person.AddressHouseLetter,
            AddressHouseNumber = person.AddressHouseNumber,
            AddressStreetName = person.AddressStreetName,
            AddressCity = person.AddressCity,
            AddressPostalCode = person.AddressPostalCode,
        };
    }

    public static OrganizationDto? ToDto(this Organization? organization)
    {
        if (organization == null)
            return null;

        return new OrganizationDto
        {
            OrgNumber = organization.OrgNumber,
            Name = organization.Name,
            UnitType = organization.UnitType,
            TelephoneNumber = organization.TelephoneNumber,
            MobileNumber = organization.MobileNumber,
            FaxNumber = organization.FaxNumber,
            EMailAddress = organization.EMailAddress,
            InternetAddress = organization.InternetAddress,
            MailingAddress = organization.MailingAddress,
            MailingPostalCode = organization.MailingPostalCode,
            MailingPostalCity = organization.MailingPostalCity,
            BusinessAddress = organization.BusinessAddress,
            BusinessPostalCode = organization.BusinessPostalCode,
            BusinessPostalCity = organization.BusinessPostalCity,
        };
    }

    public static UserProfileDto ToDto(this UserProfile profile)
    {
        return new UserProfileDto
        {
            UserId = profile.UserId,
            UserUuid = profile.UserUuid,
            UserName = profile.UserName,
            PhoneNumber = profile.PhoneNumber,
            Email = profile.Email,
            PartyId = profile.PartyId,
            Party = profile.Party?.ToDto(),
            UserType = profile.UserType.ToString(),
            ProfileSettingPreference = profile.ProfileSettingPreference?.ToDto(),
        };
    }

    public static ProfileSettingPreferenceDto? ToDto(this ProfileSettingPreference? preference)
    {
        if (preference == null)
            return null;

        return new ProfileSettingPreferenceDto
        {
            Language = preference.Language,
            PreSelectedPartyId = preference.PreSelectedPartyId,
            DoNotPromptForParty = preference.DoNotPromptForParty,
        };
    }

    private static string ScrubToken(string token)
    {
        if (string.IsNullOrEmpty(token))
            return token;

        // JWT tokens have 3 parts separated by dots: header.payload.signature
        var parts = token.Split('.');
        if (parts.Length != 3)
            return token; // Not a JWT, return as-is

        return $"{parts[0]}.<scrubbed1>.<scrubbed2>";
    }
}

/// <summary>
/// Base DTO for authenticated information
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(NoneDto), typeDiscriminator: "None")]
[JsonDerivedType(typeof(UserDto), typeDiscriminator: "User")]
[JsonDerivedType(typeof(OrgDto), typeDiscriminator: "Org")]
[JsonDerivedType(typeof(ServiceOwnerDto), typeDiscriminator: "ServiceOwner")]
[JsonDerivedType(typeof(SystemUserDto), typeDiscriminator: "SystemUser")]
public abstract class AuthenticatedDto
{
    public string TokenIssuer { get; set; } = string.Empty;
    public bool TokenIsExchanged { get; set; }
    public string Scopes { get; set; } = string.Empty;
    public string? ClientId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string? DetailsError { get; set; }
}

public class NoneDto : AuthenticatedDto { }

public class UserDto : AuthenticatedDto
{
    public int UserId { get; set; }
    public string? Username { get; set; }
    public int UserPartyId { get; set; }
    public int SelectedPartyId { get; set; }
    public int AuthenticationLevel { get; set; }
    public string AuthenticationMethod { get; set; } = string.Empty;
    public bool InAltinnPortal { get; set; }
    public bool IsSelfIdentified { get; set; }
    public UserDetailsDto? Details { get; set; }
}

public class UserDetailsDto
{
    public PartyDto UserParty { get; set; } = new();
    public PartyDto SelectedParty { get; set; } = new();
    public UserProfileDto Profile { get; set; } = new();
    public bool RepresentsSelf { get; set; }
    public List<PartyDto> Parties { get; set; } = new();
    public List<PartyDto> PartiesAllowedToInstantiate { get; set; } = new();
    public bool? CanRepresent { get; set; }
}

public class OrgDto : AuthenticatedDto
{
    public string OrgNo { get; set; } = string.Empty;
    public int AuthenticationLevel { get; set; }
    public string AuthenticationMethod { get; set; } = string.Empty;
    public OrgDetailsDto? Details { get; set; }
}

public class OrgDetailsDto
{
    public PartyDto Party { get; set; } = new();
    public bool CanInstantiate { get; set; }
}

public class ServiceOwnerDto : AuthenticatedDto
{
    public string Name { get; set; } = string.Empty;
    public string OrgNo { get; set; } = string.Empty;
    public int AuthenticationLevel { get; set; }
    public string AuthenticationMethod { get; set; } = string.Empty;
    public ServiceOwnerDetailsDto? Details { get; set; }
}

public class ServiceOwnerDetailsDto
{
    public PartyDto Party { get; set; } = new();
}

public class SystemUserDto : AuthenticatedDto
{
    public List<Guid> SystemUserId { get; set; } = new();
    public string SystemUserOrgNr { get; set; } = string.Empty;
    public string SupplierOrgNr { get; set; } = string.Empty;
    public string SystemId { get; set; } = string.Empty;
    public int AuthenticationLevel { get; set; }
    public string AuthenticationMethod { get; set; } = string.Empty;
    public SystemUserDetailsDto? Details { get; set; }
}

public class SystemUserDetailsDto
{
    public PartyDto Party { get; set; } = new();
    public bool CanInstantiate { get; set; }
}

public class PartyDto
{
    public int PartyId { get; set; }
    public string? PartyTypeName { get; set; }
    public Guid? PartyUuid { get; set; }
    public string? SSN { get; set; }
    public string? OrgNumber { get; set; }
    public string? UnitType { get; set; }
    public string? Name { get; set; }
    public bool IsDeleted { get; set; }
    public bool OnlyHierarchyElementWithNoAccess { get; set; }
    public PersonDto? Person { get; set; }
    public OrganizationDto? Organization { get; set; }
    public List<PartyDto>? ChildParties { get; set; }
}

public class PersonDto
{
    public string? SSN { get; set; }
    public string? Name { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public string? TelephoneNumber { get; set; }
    public string? MobileNumber { get; set; }
    public string? MailingAddress { get; set; }
    public string? MailingPostalCode { get; set; }
    public string? MailingPostalCity { get; set; }
    public string? AddressHouseLetter { get; set; }
    public string? AddressHouseNumber { get; set; }
    public string? AddressStreetName { get; set; }
    public string? AddressCity { get; set; }
    public string? AddressPostalCode { get; set; }
}

public class OrganizationDto
{
    public string? OrgNumber { get; set; }
    public string? Name { get; set; }
    public string? UnitType { get; set; }
    public string? TelephoneNumber { get; set; }
    public string? MobileNumber { get; set; }
    public string? FaxNumber { get; set; }
    public string? EMailAddress { get; set; }
    public string? InternetAddress { get; set; }
    public string? MailingAddress { get; set; }
    public string? MailingPostalCode { get; set; }
    public string? MailingPostalCity { get; set; }
    public string? BusinessAddress { get; set; }
    public string? BusinessPostalCode { get; set; }
    public string? BusinessPostalCity { get; set; }
}

public class UserProfileDto
{
    public int UserId { get; set; }
    public Guid? UserUuid { get; set; }
    public string? UserName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public int PartyId { get; set; }
    public PartyDto? Party { get; set; }
    public string? UserType { get; set; }
    public ProfileSettingPreferenceDto? ProfileSettingPreference { get; set; }
}

public class ProfileSettingPreferenceDto
{
    public string? Language { get; set; }
    public int PreSelectedPartyId { get; set; }
    public bool DoNotPromptForParty { get; set; }
}
