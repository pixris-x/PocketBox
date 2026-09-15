using System.Net;
using System.Net.Sockets;
using IP2Region.Net.Abstractions;

namespace PocketBox.Api.Services;

/// <summary>一次归属地查询的结果，字段与前端约定的 JSON 结构一一对应</summary>
public sealed record IpRegionLookup
{
    public required string Ip { get; init; }
    public bool Found { get; init; }
    public string? Country { get; init; }
    public string? Province { get; init; }
    public string? City { get; init; }
    public string? Isp { get; init; }
    public string? IsoCode { get; init; }
    public bool IsReserved { get; init; }

    /// <summary>原始 region 串，保留给排查用</summary>
    public string? Raw { get; init; }
}

/// <summary>
/// 包一层 ip2region 查询。region 串是「国家|省份|城市|ISP|ISO码」五段式，
/// 空字段写 "0"，Reserved 表示保留地址（不对应地理位置）。
/// </summary>
public sealed class IpRegionService(ISearcher searcher)
{
    private const char Separator = '|';
    private const string EmptyField = "0";
    private const string ReservedField = "Reserved";

    public IpRegionLookup Lookup(string rawIp)
    {
        var ip = Normalize(rawIp);

        // 库对 0.0.0.0~255.255.255.255 连续全覆盖，正常不会查不到；
        // 返回 Found=false 是为自造/裁剪库留的兜底分支
        var region = searcher.Search(ip);
        if (string.IsNullOrEmpty(region))
        {
            return new IpRegionLookup { Ip = ip, Found = false };
        }

        var parts = region.Split(Separator);
        var country = Field(parts, 0);
        return new IpRegionLookup
        {
            Ip = ip,
            Found = true,
            Country = country,
            Province = Field(parts, 1),
            City = Field(parts, 2),
            Isp = Field(parts, 3),
            IsoCode = Field(parts, 4),
            IsReserved = string.Equals(country, ReservedField, StringComparison.OrdinalIgnoreCase),
            Raw = region,
        };
    }

    /// <summary>
    /// 规整输入：去掉 /prefix、校验可解析、拒绝 IPv6，并统一成规范点分十进制。
    /// 库只收录 IPv4，IPv6 在这里就拦下来，避免把异常抛到 ip2region 内部。
    /// </summary>
    public static string Normalize(string? input)
    {
        var text = (input ?? string.Empty).Trim();
        if (text.Length == 0)
        {
            throw new ArgumentException("IP 不能为空");
        }

        var slash = text.IndexOf('/');
        if (slash >= 0)
        {
            text = text[..slash].Trim();
        }
        if (text.Length == 0)
        {
            throw new ArgumentException($"无法识别的 IP 地址：{input}");
        }

        if (!IPAddress.TryParse(text, out var parsed))
        {
            throw new ArgumentException($"无法识别的 IP 地址：{input}");
        }
        if (parsed.AddressFamily == AddressFamily.InterNetworkV6)
        {
            throw new ArgumentException("离线库只收录 IPv4，暂不支持查询 IPv6 地址");
        }

        return parsed.ToString();
    }

    private static string? Field(string[] parts, int index)
    {
        if (index >= parts.Length)
        {
            return null;
        }

        var value = parts[index];
        return value.Length == 0 || value == EmptyField ? null : value;
    }
}
