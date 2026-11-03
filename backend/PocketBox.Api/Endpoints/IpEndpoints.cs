using PocketBox.Api.Services;

namespace PocketBox.Api.Endpoints;

/// <summary>
/// IP 相关端点：
///   GET /api/ip/region   查归属地；省略 ip 参数即查访问者自己
/// </summary>
public static class IpEndpoints
{
    public static IEndpointRouteBuilder MapIpEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ip");

        group.MapGet(
            "/region",
            (string? ip, HttpContext context, IpRegionService service) =>
            {
                var target = string.IsNullOrWhiteSpace(ip) ? ClientIp.Resolve(context) : ip;
                try
                {
                    return Results.Ok(service.Lookup(target));
                }
                catch (ArgumentException ex)
                {
                    // 地址非法或为 IPv6，属于请求本身的问题，返回 400 让前端直接展示原因
                    return Results.BadRequest(new { message = ex.Message });
                }
            }
        );

        return app;
    }
}
