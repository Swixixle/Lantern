# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| main    | ✅        |

## Reporting a Vulnerability

**Do not file public issues for security vulnerabilities.**

To report a security issue, email: **albearpig@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Scope

Lantern is early-stage research software. It is provided **"as is"** without warranties of any kind. No production use is recommended without independent security review.

## Known Limitations

- Local-first storage means browser localStorage is the trust boundary
- No server-side validation or authentication
- Cryptographic verification depends on HALO-RECEIPTS integration (private system)
