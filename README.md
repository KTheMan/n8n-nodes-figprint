
# n8n-nodes-figprint

n8n community node for the Figprint Server API.

For a backlog of additional functionality we can implement (based on the upstream FigPrint server API), see: [EPIC.md](EPIC.md).

## Installation
Follow the n8n community node installation guide:
<https://docs.n8n.io/integrations/community-nodes/installation/>

## Credentials
Create a credential of type **Figprint API**.

Notes:
- Configure **Base URL** for your Figprint instance (cloud or self-hosted).
- Configure **API Token** if your server requires it (sent as `Authorization: Bearer <token>`).
- Optionally set **Default X-Figma-Token** (can be overridden per operation).

## Node: Figprint

### Parameters

**Resource**
- `Frame`
- `Preview`
- `Export`
- `Label`
- `Font`
- `Status`

**Operation**
- `List Frames`
- `Get Starter Payload`
- `Live Preview`
- `Get Preview HTML`
- `Export`
- `PDF (Wrapper)`
- `Generate Label`
- `List Fonts`
- `Font Debug`
- `Get Status`
- `Get Config`

**File Key**
- Figma file key.

**Frame** (Preview only)
- Optional frame identifier/name.
	- If **File Key** is set, the dropdown will populate from Frames → List Frames.

**Preview ID** (Preview only)
- Used by Preview → Get Preview HTML.

**Merge Payload (JSON)** (Preview only)
- Optional object merged into the preview.

**Structured Payload (JSON)** (Preview only)
- Optional structured payload object.

**Pages Spec (JSON)** (Preview only)
- Optional array describing pages.

**Preview ID** (Export only)
- Preview ID returned by Preview operations.

**Kind** (Export only)
- `pdf` | `png` | `html`

**Filename** (Export only)
- Optional output filename (without extension).

**Backend** (Export only, PDF kind)
- `weasyprint` | `krilla` (optional)

### TODO (FigPrint)

To support a dynamic dropdown of available export kinds/plugins in n8n (instead of a fixed list), FigPrint would need to expose this via its API (for example `GET /api/exporters` returning available `kind` values; optionally `GET /api/plugins` for payload/content plugins). Today, `/api/status` only provides capability hints like `render.pngAvailable`.

### Options

**Hard Refresh**
- Boolean flag to request frames with a hard refresh where supported.

**X-Figma-Token**
- Optional per-request override for the Figma token (`X-Figma-Token` header).

Preview options:
- **Mask Text**
- **Font Debug**
- **Reverse Order**
- **Plugin Debug**

Status options:
- **Diag** (Status → Get Status only)

### Output
Frames → List Frames returns JSON.

Frames → Get Starter Payload returns JSON:
- `json.fileKey`
- `json.starterPayload`

Preview → Live Preview returns JSON:
- `json.html`: HTML string returned by the server
- `json.previewId`: value of the `X-Preview-ID` response header (if present)

Preview → Get Preview HTML returns JSON:
- `json.previewId`
- `json.html`

Export → Export returns binary:
- `binary.data`: the exported file
- `json.kind`, `json.previewId`, `json.filename`, `json.contentType`

Export → PDF (Wrapper) returns binary:
- `binary.data`: PDF
- `json.previewId`, `json.filename`, `json.contentType`

Label → Generate Label returns binary:
- `binary.data`: label text (`text/plain`)
- `json.format`, `json.fileKey`, `json.frame`, `json.dpi`, `json.missing`, `json.filename`

Fonts → List Fonts returns JSON.

Fonts → Font Debug returns JSON.

Status → Get Status returns JSON.

Status → Get Config returns JSON.

## Examples

### Preview → Export (PDF) using `previewId`
1) Figprint node: **Resource** = `Preview`, **Operation** = `Live Preview`
2) Next Figprint node: **Resource** = `Export`, **Operation** = `Export`
	 - **Kind** = `pdf`
	 - **Preview ID** = `{{$json.previewId}}`

### Single-frame merge payload
In **Preview → Live Preview**, set **Merge Payload (JSON)**:
```json
{
	"name": "Kenny",
	"orderId": "12345"
}
```

### Structured payload example
In **Preview → Live Preview**, set **Structured Payload (JSON)**:
```json
{
	"page1": {
		"title": "Hello",
		"subtitle": "World"
	}
}
```

## Roadmap
See [EPIC.md](EPIC.md) for the full backlog to expand this node toward the upstream FigPrint server API (frames, preview-live, export kinds, labels, fonts, status, etc.).

## License
MIT


