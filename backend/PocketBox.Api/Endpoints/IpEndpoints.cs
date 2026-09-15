using PocketBox.Api.Services;

namespace PocketBox.Api.Endpoints;

/// <summary>
/// IP 相关端点：
///   GET /api/ip          只回报访问者自己的公网 IP
///   GET /api/ip/region   查归属地；省略 ip 参数即查访问者自己，
///                        因此「我的 IP」一次请求就能同时拿到 IP 与归属地
/// </summary>
public static class IpEndpoints
{
    public static IEndpointRouteBuilder MapIpEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ip");

        group.MapGet(string.Empty, (HttpContext context) => Results.Ok(new { ip = ClientIp.Resolve(context) }));

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
