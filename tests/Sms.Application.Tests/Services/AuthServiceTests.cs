using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Sms.Application.DTOs.Auth;
using Sms.Application.Interfaces;
using Sms.Domain.Entities;
using Sms.Domain.Enums;
using Sms.Infrastructure.Data;
using Sms.Infrastructure.Services;
using Xunit;

namespace Sms.Application.Tests.Services;

public class AuthServiceTests
{
    private readonly Mock<UserManager<ApplicationUser>> _mockUserManager;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<ILogger<AuthService>> _mockLogger;
    private readonly ApplicationDbContext _context;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        // Setup UserManager mock
        var userStoreMock = new Mock<IUserStore<ApplicationUser>>();
        _mockUserManager = new Mock<UserManager<ApplicationUser>>(
            userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        // Setup Configuration mock
        _mockConfiguration = new Mock<IConfiguration>();
        _mockConfiguration.Setup(c => c["Jwt:Secret"]).Returns("YourSuperSecretKeyThatIsAtLeast32CharactersLong!OnlineCoursesPlatform2024");
        _mockConfiguration.Setup(c => c["Jwt:Issuer"]).Returns("OnlineCoursesAPI");
        _mockConfiguration.Setup(c => c["Jwt:Audience"]).Returns("OnlineCoursesAPI");
        _mockConfiguration.Setup(c => c["Jwt:ExpirationMinutes"]).Returns("60");
        _mockConfiguration.Setup(c => c["FrontendUrl"]).Returns("http://localhost:5173");

        _mockEmailService = new Mock<IEmailService>();
        _mockLogger = new Mock<ILogger<AuthService>>();

        // Setup in-memory database for testing
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        _authService = new AuthService(
            _mockUserManager.Object, 
            _mockConfiguration.Object, 
            _mockEmailService.Object,
            _mockLogger.Object,
            _context);
    }

    #region RegisterAsync Tests

    [Fact]
    public async Task RegisterAsync_WithValidData_ShouldReturnSuccessMessage()
    {
        // Arrange - Registration now defaults to Student role and requires email verification
        var request = new RegisterRequest(
            Email: "newuser@test.com",
            Password: "Test123!",
            FirstName: "Test",
            LastName: "User"
        );

        _mockUserManager.Setup(x => x.FindByEmailAsync(request.Email))
            .ReturnsAsync((ApplicationUser?)null);

        _mockUserManager.Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), request.Password))
            .ReturnsAsync(IdentityResult.Success);

        _mockUserManager.Setup(x => x.AddToRoleAsync(It.IsAny<ApplicationUser>(), UserRole.Student.ToString()))
            .ReturnsAsync(IdentityResult.Success);

        _mockUserManager.Setup(x => x.GenerateEmailConfirmationTokenAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync("verification-token");

        _mockEmailService.Setup(x => x.SendVerificationEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _authService.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Message.Should().Contain("verify"); // Should indicate email verification needed

        _mockUserManager.Verify(x => x.CreateAsync(It.IsAny<ApplicationUser>(), request.Password), Times.Once);
        _mockUserManager.Verify(x => x.AddToRoleAsync(It.IsAny<ApplicationUser>(), "Student"), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_WithExistingEmail_ShouldReturnFailResponse()
    {
        // Arrange
        var request = new RegisterRequest(
            Email: "existing@test.com",
            Password: "Test123!",
            FirstName: "Test",
            LastName: "User"
        );

        var existingUser = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.Email
        };

        _mockUserManager.Setup(x => x.FindByEmailAsync(request.Email))
            .ReturnsAsync(existingUser);

        // Act
        var result = await _authService.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Email already registered");
        result.Data.Should().BeNull();

        _mockUserManager.Verify(x => x.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_WhenUserCreationFails_ShouldReturnFailureWithErrors()
    {
        // Arrange
        var request = new RegisterRequest(
            Email: "newuser@test.com",
            Password: "weak",
            FirstName: "Test",
            LastName: "User"
        );

        _mockUserManager.Setup(x => x.FindByEmailAsync(request.Email))
            .ReturnsAsync((ApplicationUser?)null);

        var identityErrors = new[]
        {
            new IdentityError { Description = "Password is too weak" }
        };

        _mockUserManager.Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), request.Password))
            .ReturnsAsync(IdentityResult.Failed(identityErrors));

        // Act
        var result = await _authService.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Registration failed");
        result.Errors.Should().NotBeNull();
        result.Errors.Should().Contain("Password is too weak");
    }

    #endregion

    #region CreateInstructorAsync Tests

    [Fact]
    public async Task CreateInstructorAsync_WithValidData_ShouldReturnAuthResponse()
    {
        // Arrange - Admin creates instructor (no email verification needed)
        var request = new CreateInstructorRequest(
            Email: "instructor@test.com",
            Password: "Instructor123!",
            FirstName: "John",
            LastName: "Doe"
        );

        _mockUserManager.Setup(x => x.FindByEmailAsync(request.Email))
            .ReturnsAsync((ApplicationUser?)null);

        _mockUserManager.Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), request.Password))
            .ReturnsAsync(IdentityResult.Success);

        _mockUserManager.Setup(x => x.AddToRoleAsync(It.IsAny<ApplicationUser>(), UserRole.Instructor.ToString()))
            .ReturnsAsync(IdentityResult.Success);

        _mockUserManager.Setup(x => x.UpdateAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);

        _mockUserManager.Setup(x => x.GetRolesAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(new List<string> { "Instructor" });

        _mockEmailService.Setup(x => x.SendWelcomeEmailAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _authService.CreateInstructorAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.User.Email.Should().Be(request.Email);
        result.Data.User.Role.Should().Be(UserRole.Instructor);
        result.Data.AccessToken.Should().NotBeNullOrEmpty();

        _mockUserManager.Verify(x => x.AddToRoleAsync(It.IsAny<ApplicationUser>(), "Instructor"), Times.Once);
    }

    #endregion

    #region LoginAsync Tests

    [Fact]
    public async Task LoginAsync_WithValidCredentialsAndVerifiedEmail_ShouldReturnSuccessResponse()
    {
        // Arrange
        var request = new LoginRequest(
            Email: "user@test.com",
            Password: "Test123!"
        );

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            UserName = request.Email,
            FirstName = "Test",
            LastName = "User",
            Role = UserRole.Student,
            IsActive = true,
            EmailConfirmed = true // Email must be confirmed
        };

        _mockUserManager.Setup(x => x.FindByEmailAsync(request.Email))
            .ReturnsAsync(user);

        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, request.Password))
            .ReturnsAsync(true);

        _mockUserManager.Setup(x => x.UpdateAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);

        _mockUserManager.Setup(x => x.GetRolesAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(new List<string> { "Student" });

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.User.Email.Should().Be(request.Email);
        result.Data.AccessToken.Should().NotBeNullOrEmpty();
        result.Data.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task LoginAsync_WithUnverifiedEmail_ShouldReturnFailResponse()
    {
        // Arrange
        var request = new LoginRequest(
            Email: "user@test.com",
            Password: "Test123!"
        );

        var user = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.Email,
            IsActive = true,
            EmailConfirmed = false // Email not verified
        };

        _mockUserManager.Setup(x => x.FindByEmailAsync(request.Email))
            .ReturnsAsync(user);

        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, request.Password))
            .ReturnsAsync(true);

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("verify");
    }

    [Fact]
    public async Task LoginAsync_WithInvalidEmail_ShouldReturnFailResponse()
    {
        // Arrange
        var request = new LoginRequest(
            Email: "nonexistent@test.com",
            Password: "Test123!"
        );

        _mockUserManager.Setup(x => x.FindByEmailAsync(request.Email))
            .ReturnsAsync((ApplicationUser?)null);

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid email or password");
        result.Data.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_WithInvalidPassword_ShouldReturnFailResponse()
    {
        // Arrange
        var request = new LoginRequest(
            Email: "user@test.com",
            Password: "WrongPassword!"
        );

        var user = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.Email,
            IsActive = true,
            EmailConfirmed = true
        };

        _mockUserManager.Setup(x => x.FindByEmailAsync(request.Email))
            .ReturnsAsync(user);

        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, request.Password))
            .ReturnsAsync(false);

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid email or password");
        result.Data.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_WithInactiveAccount_ShouldReturnFailResponse()
    {
        // Arrange
        var request = new LoginRequest(
            Email: "user@test.com",
            Password: "Test123!"
        );

        var user = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.Email,
            IsActive = false,
            EmailConfirmed = true
        };

        _mockUserManager.Setup(x => x.FindByEmailAsync(request.Email))
            .ReturnsAsync(user);

        _mockUserManager.Setup(x => x.CheckPasswordAsync(user, request.Password))
            .ReturnsAsync(true);

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Account is deactivated");
        result.Data.Should().BeNull();
    }

    #endregion

    #region ChangePasswordAsync Tests

    [Fact]
    public async Task ChangePasswordAsync_WithValidData_ShouldReturnSuccessResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new ChangePasswordRequest(
            CurrentPassword: "OldPassword123!",
            NewPassword: "NewPassword123!"
        );

        var user = new ApplicationUser
        {
            Id = userId,
            Email = "user@test.com"
        };

        _mockUserManager.Setup(x => x.FindByIdAsync(userId.ToString()))
            .ReturnsAsync(user);

        _mockUserManager.Setup(x => x.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _authService.ChangePasswordAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Password changed successfully");

        _mockUserManager.Verify(x => x.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword), Times.Once);
    }

    [Fact]
    public async Task ChangePasswordAsync_WithInvalidUserId_ShouldReturnFailResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new ChangePasswordRequest(
            CurrentPassword: "OldPassword123!",
            NewPassword: "NewPassword123!"
        );

        _mockUserManager.Setup(x => x.FindByIdAsync(userId.ToString()))
            .ReturnsAsync((ApplicationUser?)null);

        // Act
        var result = await _authService.ChangePasswordAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found");
    }

    #endregion

    #region Token Generation Tests

    [Fact]
    public async Task GenerateAccessTokenAsync_ShouldReturnValidToken()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            FirstName = "Test",
            LastName = "User",
            Role = UserRole.Student
        };

        _mockUserManager.Setup(x => x.GetRolesAsync(user))
            .ReturnsAsync(new List<string> { "Student" });

        // Act
        var token = await _authService.GenerateAccessTokenAsync(user);

        // Assert
        token.Should().NotBeNullOrEmpty();
        // Token should be a valid JWT format (3 parts separated by dots)
        token.Split('.').Should().HaveCount(3);
    }

    [Fact]
    public async Task GenerateRefreshTokenAsync_ShouldReturnBase64String()
    {
        // Act
        var refreshToken = await _authService.GenerateRefreshTokenAsync();

        // Assert
        refreshToken.Should().NotBeNullOrEmpty();
        // Should be a valid Base64 string
        Action act = () => Convert.FromBase64String(refreshToken);
        act.Should().NotThrow<FormatException>();
    }

    #endregion

    #region LogoutAsync Tests

    [Fact]
    public async Task LogoutAsync_WithValidUserId_ShouldClearRefreshToken()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new ApplicationUser
        {
            Id = userId,
            Email = "user@test.com",
            RefreshToken = "some-refresh-token",
            RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7)
        };

        _mockUserManager.Setup(x => x.FindByIdAsync(userId.ToString()))
            .ReturnsAsync(user);

        _mockUserManager.Setup(x => x.UpdateAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _authService.LogoutAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Logged out successfully");

        _mockUserManager.Verify(x => x.UpdateAsync(It.Is<ApplicationUser>(u => 
            u.RefreshToken == null && u.RefreshTokenExpiryTime == null)), Times.Once);
    }

    #endregion
}
