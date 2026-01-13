# Proxy Configuration Guide

## Overview
This application uses IPRoyal/Webshare residential proxies to avoid YouTube rate limiting when fetching transcripts.

## Current Configuration

### Environment Variables
Set these in your `.env` file:

```bash
WS_USER=ivpzpnvq-rotate
WS_PASS=your_password_here
```

### Proxy Implementation
**IMPORTANT**: Use `GenericProxyConfig` instead of `WebshareProxyConfig` to avoid username modification bugs.

```python
from youtube_transcript_api.proxies import GenericProxyConfig

proxy_url = f"http://{ws_user}:{ws_pass}@p.webshare.io:80/"
proxy_config = GenericProxyConfig(
    http_url=proxy_url,
    https_url=proxy_url,
)
api = YouTubeTranscriptApi(proxy_config=proxy_config)
```

## Why Not WebshareProxyConfig?

The `WebshareProxyConfig` class has a bug where it modifies usernames ending with `-rotate`:

- **Original username**: `ivpzpnvq-rotate`
- **After WebshareProxyConfig**: `ivpzpnvq-rotate-US-rotate` (with `filter_ip_locations`)
  or `ivpzpnvq-rotate-rotate` (without filter)

This causes **407 Proxy Authentication Required** errors because the proxy server doesn't recognize the modified username.

## Testing Proxy Configuration

Run the validation tests before deploying:

```bash
cd backend
pytest tests/test_proxy_config.py -v
```

Or run all tests:
```bash
python tests/test_proxy_config.py
```

## Troubleshooting

### 407 Proxy Authentication Required

**Symptoms**:
```
ProxyError: Unable to connect to proxy
OSError: Tunnel connection failed: 407 Proxy Authentication Required
```

**Causes**:
1. Wrong username/password
2. Using `WebshareProxyConfig` with usernames ending in `-rotate`
3. Proxy subscription expired

**Solutions**:
1. Verify credentials in Webshare dashboard
2. Ensure you're using `GenericProxyConfig` in code
3. Check proxy subscription status

### Connection Timeout

**Symptoms**:
```
TimeoutError: Proxy connection timed out
```

**Causes**:
1. Proxy server down
2. Network/firewall blocking proxy port 80
3. Incorrect proxy endpoint

**Solutions**:
1. Test proxy manually: `curl -x http://user:pass@p.webshare.io:80 https://httpbin.org/ip`
2. Check firewall settings
3. Verify proxy endpoint URL

### YouTube Still Blocking

**Symptoms**:
```
NoTranscriptFound: YouTube is blocking requests from your IP
```

**Causes**:
1. Proxy not rotating IPs
2. Too many requests from same proxy IP
3. Proxy detected as datacenter IP

**Solutions**:
1. Verify you're using residential proxies, not datacenter
2. Add delays between requests
3. Check proxy rotation settings in Webshare dashboard

## Proxy Providers

### IPRoyal (Current)
- Endpoint: `p.webshare.io:80`
- Format: `http://username:password@p.webshare.io:80/`
- Documentation: https://apidocs.webshare.io/proxy-config

### Switching Proxy Providers

To use a different proxy provider, update the proxy URL in:
- `app/services/transcript_extractor.py` (2 locations)

Example for different providers:

```python
# Generic SOCKS proxy
proxy_url = f"socks5://{user}:{pass}@proxy.example.com:1080/"

# HTTP proxy
proxy_url = f"http://{user}:{pass}@proxy.example.com:8080/"

# HTTPS proxy
proxy_url = f"https://{user}:{pass}@proxy.example.com:443/"
```

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` file to version control
- Use environment variables for credentials
- Rotate proxy passwords regularly
- Monitor proxy usage for unusual activity
- Keep proxy credentials separate from application credentials

## Maintenance

- **Monthly**: Rotate proxy passwords
- **Quarterly**: Review proxy usage and optimize settings
- **As needed**: Update proxy endpoints if provider changes

## Related Files

- `app/services/transcript_extractor.py` - Proxy configuration implementation
- `tests/test_proxy_config.py` - Proxy validation tests
- `.env` - Proxy credentials (not in version control)
