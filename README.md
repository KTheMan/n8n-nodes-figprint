
# n8n-nodes-figprint

This package provides an n8n node for integrating with the [Figprint API](https://docs.Figprint.cc/api.html).

## Features
- Render documents and images using Figprint templates
- Supports `/render` and `/cached` endpoints
- GUI-first setup for all options except payload
- Secure credential management via environment variable (`FIGPRINT_API_TOKEN`)

## Installation
Follow the [n8n community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Usage
1. Add the Figprint node to your workflow.
2. Set your Figprint API token in your environment as `FIGPRINT_API_TOKEN`.
3. Select the endpoint, template ID, and configure options in the GUI.
4. Enter your payload as JSON (supports both simple and structured modes).

## Credentials
Your API token is managed securely via environment variable. No need to store secrets in workflows.

## Resources
- [Figprint API Docs](https://docs.Figprint.cc/api.html)
- [n8n Docs](https://docs.n8n.io/)

## License
MIT

## More information

Refer to our [documentation on creating nodes](https://docs.n8n.io/integrations/creating-nodes/) for detailed information on building your own nodes.

## License

[MIT](https://github.com/n8n-io/n8n-nodes-starter/blob/master/LICENSE.md)


