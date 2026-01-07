using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Sms.Application.DTOs.Auth;
using Sms.Application.Interfaces;
using Sms.Domain.Enums;
using Sms.WebApi.Controllers;
using Xunit;

namespace Sms.WebApi.Tests.Controllers;

public class AuthControllerTests
{
    private readonly Mock<IAuthService> _mockAuthService;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _mockAuthService = new Mock<IAuthService>();
        _controller = new AuthController(_mockAuthService.Object);
    }

    #region Register Tests

    [Fact]
    public async Task Register_WithValidRequest_ShouldReturnOkWithSuccessMessage()
    {
        // Arrange - Registration now defaults to Student (no Role parameter)
        var request = new RegisterRequest(
            Email: "newuser@test.com",
            Password: "Test123!",
            FirstName: "Test",
            LastName: "User"
        );

        // Registration returns success message (user needs to verify email)
        var apiResponse = Application.DTOs.Common.ApiResponse<AuthResponse>.SuccessResponse(null!, 
            "Registration successful! Please check your email to verify your account.");

        _mockAuthService.Setup(x => x.RegisterAsync(request))
            .ReturnsAsync(apiResponse);

        // Act
        var result = await _controller.Register(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(apiResponse);

        _mockAuthService.Verify(x => x.RegisterAsync(request), Times.Once);
    }

    [Fact]
    public async Task Register_WithExistingEmail_ShouldReturnBadRequest()
    {
        // Arrange
        var request = new RegisterRequest(
            Email: "existing@test.com",
            Password: "Test123!",
            FirstName: "Test",
            LastName: "User"
        );

        var apiResponse = Application.DTOs.Common.ApiResponse<AuthResponse>.FailResponse("Email already registered");

        _mockAuthService.Setup(x => x.RegisterAsync(request))
            .ReturnsAsync(apiResponse);

        // Act
        var result = await _controller.Register(request);

        // Assert
        result.Should().NotBeNull();
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be(apiResponse);
    }

    #endregion

    #region Login Tests

    [Fact]
    public async Task Login_WithValidCredentials_ShouldReturnOkWithAuthResponse()
    {
        // Arrange
        var request = new LoginRequest(
            Email: "user@test.com",
            Password: "Test123!"
        );

        var authResponse = new AuthResponse(
            AccessToken: "test-access-token",
            RefreshToken: "test-refresh-token",
            ExpiresAt: DateTime.UtcNow.AddMinutes(60),
            User: new UserDto(
                Id: Guid.NewGuid(),
                Email: request.Email,
                FirstName: "Test",
                LastName: "User",
                Role: UserRole.Student,
                ProfilePictureUrl: null,
                EmailConfirmed: true
            )
        );

        var apiResponse = Application.DTOs.Common.ApiResponse<AuthResponse>.SuccessResponse(authResponse);

        _mockAuthService.Setup(x => x.LoginAsync(request))
            .ReturnsAsync(apiResponse);

        // Act
        var result = await _controller.Login(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(apiResponse);

        _mockAuthService.Verify(x => x.LoginAsync(request), Times.Once);
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ShouldReturnUnauthorized()
    {
        // Arrange
        var request = new LoginRequest(
            Email: "user@test.com",
            Password: "WrongPassword!"
        );

        var apiResponse = Application.DTOs.Common.ApiResponse<AuthResponse>.FailResponse("Invalid email or password");

        _mockAuthService.Setup(x => x.LoginAsync(request))
            .ReturnsAsync(apiResponse);

        // Act
        var result = await _controller.Login(request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().Be(apiResponse);
    }

    #endregion

    #region RefreshToken Tests

    [Fact]
    public async Task RefreshToken_WithValidTokens_ShouldReturnOkWithNewTokens()
    {
        // Arrange
        var request = new RefreshTokenRequest(
            AccessToken: "old-access-token",
            RefreshToken: "old-refresh-token"
        );

        var authResponse = new AuthResponse(
            AccessToken: "new-access-token",
            RefreshToken: "new-refresh-token",
            ExpiresAt: DateTime.UtcNow.AddMinutes(60),
            User: new UserDto(
                Id: Guid.NewGuid(),
                Email: "user@test.com",
                FirstName: "Test",
                LastName: "User",
                Role: UserRole.Student,
                ProfilePictureUrl: null,
                EmailConfirmed: true
            )
        );

        var apiResponse = Application.DTOs.Common.ApiResponse<AuthResponse>.SuccessResponse(authResponse);

        _mockAuthService.Setup(x => x.RefreshTokenAsync(request))
            .ReturnsAsync(apiResponse);

        // Act
        var result = await _controller.RefreshToken(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(apiResponse);

        _mockAuthService.Verify(x => x.RefreshTokenAsync(request), Times.Once);
    }

    [Fact]
    public async Task RefreshToken_WithInvalidTokens_ShouldReturnUnauthorized()
    {
        // Arrange
        var request = new RefreshTokenRequest(
            AccessToken: "invalid-access-token",
            RefreshToken: "invalid-refresh-token"
        );

        var apiResponse = Application.DTOs.Common.ApiResponse<AuthResponse>.FailResponse("Invalid refresh token");

        _mockAuthService.Setup(x => x.RefreshTokenAsync(request))
            .ReturnsAsync(apiResponse);

        // Act
        var result = await _controller.RefreshToken(request);

        // Assert
        result.Should().NotBeNull();
        var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().Be(apiResponse);
    }

    #endregion

    #region CreateInstructor Tests

    [Fact]
    public async Task CreateInstructor_WithValidRequest_ShouldReturnOkWithAuthResponse()
    {
        // Arrange - Admin creates instructor
        var request = new CreateInstructorRequest(
            Email: "newinstructor@test.com",
            Password: "Instructor123!",
            FirstName: "John",
            LastName: "Doe"
        );

        var authResponse = new AuthResponse(
            AccessToken: "instructor-access-token",
            RefreshToken: "instructor-refresh-token",
            ExpiresAt: DateTime.UtcNow.AddMinutes(60),
            User: new UserDto(
                Id: Guid.NewGuid(),
                Email: request.Email,
                FirstName: request.FirstName,
                LastName: request.LastName,
                Role: UserRole.Instructor,
                ProfilePictureUrl: null,
                EmailConfirmed: true
            )
        );

        var apiResponse = Application.DTOs.Common.ApiResponse<AuthResponse>.SuccessResponse(authResponse);

        _mockAuthService.Setup(x => x.CreateInstructorAsync(request))
            .ReturnsAsync(apiResponse);

        // Act
        var result = await _controller.CreateInstructor(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(apiResponse);

        _mockAuthService.Verify(x => x.CreateInstructorAsync(request), Times.Once);
    }

    #endregion
}
