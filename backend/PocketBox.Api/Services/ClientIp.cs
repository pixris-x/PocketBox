namespace PocketBox.Api.Services;

/// <summary>
/// 取访问者的公网地址：优先读反向代理写入的头（见 deploy/nginx.conf），
/// 直连时回落连接地址。
///
/// 注意 X-Real-IP / X-Forwarded-For 都可以被客户端伪造，所以这里成立的前提是
/// API 容器只经由 nginx 访问、端口不对公网暴露。若将来直接发布容器端口，
/// 必须改成只信任固定代理地址（用 ASP.NET Core 的 ForwardedHeaders 中间件 + KnownProxies）。
/// </summary>
public static class ClientIp
{
    public static string Resolve(HttpContext context)
    {
        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(realIp))
        {
            return Normalize(realIp);
        }

        // X-Forwarded-For 形如「客户端, 代理1, 代理2」，最左侧才是原始客户端
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            return Normalize(forwarded.Split(',')[0]);
        }

        return Normalize(context.Connection.RemoteIpAddress?.ToString());
    }

    /// <summary>IPv6-mapped IPv4（::ffff:1.2.3.4）还原成 IPv4，前端可直接拿去查归属地</summary>
    private static string Normalize(string? value)
    {
        var text = (value ?? string.Empty).Trim();
        const string mappedPrefix = "::ffff:";
        if (text.StartsWith(mappedPrefix, StringComparison.OrdinalIgnoreCase))
        {
            text = text[mappedPrefix.Length..];
        }

        return text;
    }
}
