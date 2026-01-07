using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sms.Application.Interfaces;

namespace Sms.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    private Guid UserId => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!);

    [HttpPost("create-intent/{courseId}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> CreatePaymentIntent(Guid courseId)
    {
        var result = await _paymentService.CreatePaymentIntentAsync(UserId, courseId);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetPaymentHistory()
    {
        var result = await _paymentService.GetUserPaymentsAsync(UserId);
        return Ok(result);
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleWebhook()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"];

        try 
        {
            var result = await _paymentService.HandleWebhookAsync(json, signature!);
            if (result.Success) return Ok();
            return BadRequest();
        }
        catch
        {
            return BadRequest();
        }
    }
}
