
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
- Configure **API Token** (sent as `Authorization: Bearer <token>`).

## Node: Figprint

### Parameters

**Resource**
- `Frames`
- `Preview`
- `Export`

**Operation**
- `List Frames`
- `Live Preview`
- `Export`
- `PDF (Wrapper)`

**File Key**
- Figma file key.

**Frame** (Preview only)
- Optional frame identifier/name.

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

### Output
Frames → List Frames returns JSON.

Preview → Live Preview returns JSON:
- `json.html`: HTML string returned by the server
- `json.previewId`: value of the `X-Preview-ID` response header (if present)

Export → Export returns binary:
- `binary.data`: the exported file
- `json.kind`, `json.previewId`, `json.filename`, `json.contentType`

Export → PDF (Wrapper) returns binary:
- `binary.data`: PDF
- `json.previewId`, `json.filename`, `json.contentType`

## Roadmap
See [EPIC.md](EPIC.md) for the full backlog to expand this node toward the upstream FigPrint server API (frames, preview-live, export kinds, labels, fonts, status, etc.).

## License
MIT


