
# n8n-nodes-figprint

n8n community node for FigPrint/Figprint rendering.

This repository currently exposes a minimal **template render** integration (two operations: `render` and `cached`) and returns the result as **binary** output.

For a backlog of additional functionality we can implement (based on the upstream FigPrint server API), see: [EPIC.md](EPIC.md).

## Installation
Follow the n8n community node installation guide:
<https://docs.n8n.io/integrations/community-nodes/installation/>

## Credentials
Create a credential of type **Figprint API** and paste your API token.

Notes:
- This node uses n8n credentials (recommended). It does not require an environment variable.
- The token is sent as `Authorization: Bearer <token>`.

## Node: Figprint

### Parameters

**Endpoint**
- `render` (POST)
- `cached` (GET)

**Template ID**
- The template identifier used in the request URL.

**Payload (JSON)**
- JSON object to send.
- For `render`: sent as the request body.
- For `cached`: converted into query parameters.

### Options

**Custom Endpoint (Full URL)**
- If set, the node uses this URL as-is and ignores **Endpoint** and **Template ID**.

**Export File Format**
- `pdf` | `png` | `jpeg` | `webp`
- Controls how n8n will label the binary data (filename extension + MIME type).

**Filename**
- Filename used for the returned binary (defaults to `document`).

**Export Pure PDF**
- Boolean flag forwarded in the payload as `f2a_exportPurePDF`.

**Cache Buster**
- Boolean flag forwarded in the payload as `f2a_cacheBuster`.

**Debug Output**
- When enabled, the node adds a `json.debug` object to the output (request metadata and a generated curl command).

### Output
The node returns:
- `binary.data`: the rendered file
- `json`: empty by default; contains `debug` info when **Debug Output** is enabled

## Roadmap
See [EPIC.md](EPIC.md) for the full backlog to expand this node toward the upstream FigPrint server API (frames, preview-live, export kinds, labels, fonts, status, etc.).

## License
MIT


