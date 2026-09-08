using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors.Nets;
using Altinn.App.Core.Features.Payment.Processors.Nets.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Payment.Providers.Nets;

public class NetsMapperTests
{
    [Fact]
    public void MapPayerDetails_ValidConsumer_ReturnsPayer()
    {
        // Arrange
        var consumer = new NetsConsumer
        {
            Company = new NetsCompany
            {
                Name = "Firmanavn",
                RegistrationNumber = "123456789",
                ContactDetails = new NetsContactDetails
                {
                    FirstName = "Ola",
                    LastName = "Normann",
                    Email = "ola.normann@example.com",
                    PhoneNumber = new NetsPhoneNumber { Prefix = "+47", Number = "12345678" },
                },
            },
            PrivatePerson = new NetsPrivatePerson
            {
                FirstName = "Kari",
                LastName = "Normann",
                Email = "ola.normann@example.com",
                PhoneNumber = new NetsPhoneNumber { Prefix = "+47", Number = "87654321" },
            },
            ShippingAddress = new NetsAddress
            {
                ReceiverLine = "Ola Normann",
                AddressLine1 = "Gate 1",
                AddressLine2 = "Adresselinje 1",
                PostalCode = "1234",
                City = "By",
                Country = "Land",
            },
            BillingAddress = new NetsAddress
            {
                ReceiverLine = "Kari Normann",
                AddressLine1 = "Gate 2",
                AddressLine2 = "Adresselinje 2",
                PostalCode = "5678",
                City = "By",
                Country = "Land",
            },
        };

        // Act
        Payer? result = NetsMapper.MapPayerDetails(consumer);

        // Assert
        result.Should().NotBeNull();
        result!.Company.Should().NotBeNull();
        result.Company!.Name.Should().Be("Firmanavn");
        result.Company.OrganizationNumber.Should().Be("123456789");
        result.Company.ContactPerson.Should().NotBeNull();
        result.Company.ContactPerson!.FirstName.Should().Be("Ola");
        result.Company.ContactPerson.LastName.Should().Be("Normann");
        result.Company.ContactPerson.Email.Should().Be("ola.normann@example.com");
        result.Company.ContactPerson.PhoneNumber.Should().NotBeNull();
        result.Company.ContactPerson.PhoneNumber!.Prefix.Should().Be("+47");
        result.Company.ContactPerson.PhoneNumber.Number.Should().Be("12345678");

        result.PrivatePerson.Should().NotBeNull();
        result.PrivatePerson!.FirstName.Should().Be("Kari");
        result.PrivatePerson.LastName.Should().Be("Normann");
        result.PrivatePerson.Email.Should().Be("ola.normann@example.com");
        result.PrivatePerson.PhoneNumber.Should().NotBeNull();
        result.PrivatePerson.PhoneNumber!.Prefix.Should().Be("+47");
        result.PrivatePerson.PhoneNumber.Number.Should().Be("87654321");

        result.ShippingAddress.Should().NotBeNull();
        result.ShippingAddress!.Name.Should().Be("Ola Normann");
        result.ShippingAddress.AddressLine1.Should().Be("Gate 1");
        result.ShippingAddress.AddressLine2.Should().Be("Adresselinje 1");
        result.ShippingAddress.PostalCode.Should().Be("1234");
        result.ShippingAddress.City.Should().Be("By");
        result.ShippingAddress.Country.Should().Be("Land");

        result.BillingAddress.Should().NotBeNull();
        result.BillingAddress!.Name.Should().Be("Kari Normann");
        result.BillingAddress.AddressLine1.Should().Be("Gate 2");
        result.BillingAddress.AddressLine2.Should().Be("Adresselinje 2");
        result.BillingAddress.PostalCode.Should().Be("5678");
        result.BillingAddress.City.Should().Be("By");
        result.BillingAddress.Country.Should().Be("Land");
    }

    [Fact]
    public void MapPayerDetails_ValidPayerCompany_ReturnsNetsConsumer()
    {
        // Arrange
        var payer = new Payer
        {
            Company = new PayerCompany
            {
                Name = "Firmanavn",
                ContactPerson = new PayerPrivatePerson
                {
                    FirstName = "Ola",
                    LastName = "Normann",
                    Email = "ola.normann@example.com",
                    PhoneNumber = new PhoneNumber { Prefix = "+47", Number = "12345678" },
                },
            },
            ShippingAddress = new Address
            {
                Name = "Ola Normann",
                AddressLine1 = "Gate 1",
                AddressLine2 = "Adresselinje 1",
                PostalCode = "1234",
                City = "By",
                Country = "Land",
            },
            BillingAddress = new Address
            {
                Name = "Kari Normann",
                AddressLine1 = "Gate 2",
                AddressLine2 = "Adresselinje 2",
                PostalCode = "5678",
                City = "By",
                Country = "Land",
            },
        };

        // Act
        NetsCheckoutConsumerDetails? result = NetsMapper.MapConsumerDetails(payer);

        // Assert
        result.Should().NotBeNull();

        result!.Company.Should().NotBeNull();
        result.Company!.Name.Should().Be("Firmanavn");
        result.Company.Contact.Should().NotBeNull();
        result.Company.Contact!.FirstName.Should().Be("Ola");
        result.Company.Contact.LastName.Should().Be("Normann");
        result.Email.Should().Be("ola.normann@example.com");
        result.PhoneNumber.Should().NotBeNull();
        result.PhoneNumber!.Prefix.Should().Be("+47");
        result.PhoneNumber.Number.Should().Be("12345678");

        result.PrivatePerson.Should().BeNull();

        result.ShippingAddress.Should().NotBeNull();
        result.ShippingAddress!.ReceiverLine.Should().Be("Ola Normann");
        result.ShippingAddress.AddressLine1.Should().Be("Gate 1");
        result.ShippingAddress.AddressLine2.Should().Be("Adresselinje 1");
        result.ShippingAddress.PostalCode.Should().Be("1234");
        result.ShippingAddress.City.Should().Be("By");
        result.ShippingAddress.Country.Should().Be("Land");

        result.BillingAddress.Should().NotBeNull();
        result.BillingAddress!.ReceiverLine.Should().Be("Kari Normann");
        result.BillingAddress.AddressLine1.Should().Be("Gate 2");
        result.BillingAddress.AddressLine2.Should().Be("Adresselinje 2");
        result.BillingAddress.PostalCode.Should().Be("5678");
        result.BillingAddress.City.Should().Be("By");
        result.BillingAddress.Country.Should().Be("Land");
    }

    [Fact]
    public void MapPayerDetails_ValidPayerPrivatePerson_ReturnsNetsConsumer()
    {
        // Arrange
        var payer = new Payer
        {
            PrivatePerson = new PayerPrivatePerson
            {
                FirstName = "Kari",
                LastName = "Normann",
                Email = "ola.normann@example.com",
                PhoneNumber = new PhoneNumber { Prefix = "+47", Number = "87654321" },
            },
            ShippingAddress = new Address
            {
                Name = "Ola Normann",
                AddressLine1 = "Gate 1",
                AddressLine2 = "Adresselinje 1",
                PostalCode = "1234",
                City = "By",
                Country = "Land",
            },
            BillingAddress = new Address
            {
                Name = "Kari Normann",
                AddressLine1 = "Gate 2",
                AddressLine2 = "Adresselinje 2",
                PostalCode = "5678",
                City = "By",
                Country = "Land",
            },
        };

        // Act
        NetsCheckoutConsumerDetails? result = NetsMapper.MapConsumerDetails(payer);

        // Assert
        result.Should().NotBeNull();

        result!.Company.Should().BeNull();

        result.PrivatePerson.Should().NotBeNull();
        result.PrivatePerson!.FirstName.Should().Be("Kari");
        result.PrivatePerson.LastName.Should().Be("Normann");
        result.Email.Should().Be("ola.normann@example.com");
        result.PhoneNumber.Should().NotBeNull();
        result.PhoneNumber!.Prefix.Should().Be("+47");
        result.PhoneNumber.Number.Should().Be("87654321");

        result.ShippingAddress.Should().NotBeNull();
        result.ShippingAddress!.ReceiverLine.Should().Be("Ola Normann");
        result.ShippingAddress.AddressLine1.Should().Be("Gate 1");
        result.ShippingAddress.AddressLine2.Should().Be("Adresselinje 1");
        result.ShippingAddress.PostalCode.Should().Be("1234");
        result.ShippingAddress.City.Should().Be("By");
        result.ShippingAddress.Country.Should().Be("Land");

        result.BillingAddress.Should().NotBeNull();
        result.BillingAddress!.ReceiverLine.Should().Be("Kari Normann");
        result.BillingAddress.AddressLine1.Should().Be("Gate 2");
        result.BillingAddress.AddressLine2.Should().Be("Adresselinje 2");
        result.BillingAddress.PostalCode.Should().Be("5678");
        result.BillingAddress.City.Should().Be("By");
        result.BillingAddress.Country.Should().Be("Land");
    }

    [Fact]
    public void MapPayerDetails_BothCompanyAndPrivatePersonIsSet_ThrowsArgumentException()
    {
        // Arrange
        var payer = new Payer { Company = new PayerCompany(), PrivatePerson = new PayerPrivatePerson() };

        // Act & assert
        Assert.Throws<ArgumentException>(() => NetsMapper.MapConsumerDetails(payer));
    }

    [Fact]
    public void MapConsumerTypes_ValidPayerTypes_ReturnsCorrectConsumerTypes()
    {
        // Arrange
        var payerTypes = new PayerType[] { PayerType.Company, PayerType.Person };

        // Act
        List<string> result = NetsMapper.MapConsumerTypes(payerTypes);

        // Assert
        result.Should().Contain("B2B");
        result.Should().Contain("B2C");
    }

    [Fact]
    public void MapInvoiceDetails_ValidNetsInvoiceDetails_ReturnsInvoiceDetails()
    {
        // Arrange
        var netsInvoiceDetails = new NetsInvoiceDetails { InvoiceNumber = "INV123456" };

        // Act
        InvoiceDetails? result = NetsMapper.MapInvoiceDetails(netsInvoiceDetails);

        // Assert
        result.Should().NotBeNull();
        result!.InvoiceNumber.Should().Be("INV123456");
    }

    [Fact]
    public void MapCardDetails_ValidNetsCardDetails_ReturnsCardDetails()
    {
        // Arrange
        var netsCardDetails = new NetsCardDetails { MaskedPan = "1234********5678", ExpiryDate = "12/25" };

        // Act
        CardDetails? result = NetsMapper.MapCardDetails(netsCardDetails);

        // Assert
        result.Should().NotBeNull();
        result!.MaskedPan.Should().Be("1234********5678");
        result.ExpiryDate.Should().Be("12/25");
    }

    [Fact]
    public void MapAddress_NullAddress_ReturnsNull()
    {
        NetsAddress? address = null;
        Address? result = NetsMapper.MapAddress(address);
        result.Should().BeNull();
    }

    [Fact]
    public void MapAddress_ValidAddress_ReturnsMappedAddress()
    {
        // Arrange
        var address = new NetsAddress
        {
            ReceiverLine = "Mottaker",
            AddressLine1 = "Adresselinje 1",
            AddressLine2 = "Adresselinje 2",
            PostalCode = "1234",
            City = "By",
            Country = "Land",
        };

        // Act
        Address? result = NetsMapper.MapAddress(address);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Mottaker");
        result.AddressLine1.Should().Be("Adresselinje 1");
        result.AddressLine2.Should().Be("Adresselinje 2");
        result.PostalCode.Should().Be("1234");
        result.City.Should().Be("By");
        result.Country.Should().Be("Land");
    }

    [Fact]
    public void MapPayerDetails_NullConsumer_ReturnsNull()
    {
        NetsConsumer? consumer = null;
        Payer? result = NetsMapper.MapPayerDetails(consumer);
        result.Should().BeNull();
    }

    [Fact]
    public void MapConsumerTypes_NullPayerTypes_ReturnsEmptyList()
    {
        PayerType[]? payerTypes = null;
        List<string> result = NetsMapper.MapConsumerTypes(payerTypes);
        result.Should().BeEmpty();
    }

    [Fact]
    public void MapCardDetails_NullNetsCardDetails_ReturnsNull()
    {
        NetsCardDetails? netsCardDetails = null;
        CardDetails? result = NetsMapper.MapCardDetails(netsCardDetails);
        result.Should().BeNull();
    }

    [Fact]
    public void MapInvoiceDetails_NullNetsInvoiceDetails_ReturnsNull()
    {
        NetsInvoiceDetails? netsInvoiceDetails = null;
        InvoiceDetails? result = NetsMapper.MapInvoiceDetails(netsInvoiceDetails);
        result.Should().BeNull();
    }
}
