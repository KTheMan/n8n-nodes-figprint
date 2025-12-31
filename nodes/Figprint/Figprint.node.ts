import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IDataObject,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { figprintApiRequest } from './GenericFunctions';

export class Figprint implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Figprint',
        name: 'figprint',
        group: ['transform'],
        version: 1,
        description: 'Interact with the Figprint Server API',
        icon: { light: 'file:logo.svg', dark: 'file:logo.svg' },
        defaults: {
            name: 'figprint',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        usableAsTool: true,
        credentials: [
            {
                name: 'figprintApi',
                required: true,
                testedBy: 'FigprintApi',
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                options: [
                    { name: 'Frames', value: 'frames' },
                    { name: 'Preview', value: 'preview' },
                    { name: 'Export', value: 'export' },
                    { name: 'Label', value: 'label' },
                    { name: 'Fonts', value: 'fonts' },
                    { name: 'Status', value: 'status' },
                ],
                default: 'frames',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: ['frames'],
                    },
                },
                options: [
                    { name: 'List Frames', value: 'list' },
                ],
                default: 'list',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: ['preview'],
                    },
                },
                options: [
                    { name: 'Live Preview', value: 'livePreview' },
                    { name: 'Get Preview HTML', value: 'getHtml' },
                ],
                default: 'livePreview',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: ['export'],
                    },
                },
                options: [
                    { name: 'Export', value: 'export' },
                    { name: 'PDF (Wrapper)', value: 'pdf' },
                ],
                default: 'export',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: ['label'],
                    },
                },
                options: [
                    { name: 'Generate Label', value: 'generate' },
                ],
                default: 'generate',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: ['fonts'],
                    },
                },
                options: [
                    { name: 'List Fonts', value: 'list' },
                    { name: 'Font Debug', value: 'debug' },
                ],
                default: 'list',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: ['status'],
                    },
                },
                options: [
                    { name: 'Get Status', value: 'status' },
                    { name: 'Get Config', value: 'config' },
                ],
                default: 'status',
            },
            {
                displayName: 'File Key',
                name: 'fileKey',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['frames'],
                        operation: ['list'],
                    },
                },
                description: 'Figma file key',
            },
            {
                displayName: 'File Key',
                name: 'fileKey',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['preview'],
                        operation: ['livePreview'],
                    },
                },
                description: 'Figma file key',
            },
            {
                displayName: 'Frame',
                name: 'frame',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['preview'],
                        operation: ['livePreview'],
                    },
                },
                description: 'Optional frame identifier/name (if omitted, server default applies)',
            },
            {
                displayName: 'Merge Payload (JSON)',
                name: 'mergePayload',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        resource: ['preview'],
                        operation: ['livePreview'],
                    },
                },
                description: 'Optional merge payload object',
            },
            {
                displayName: 'Structured Payload (JSON)',
                name: 'structuredPayload',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        resource: ['preview'],
                        operation: ['livePreview'],
                    },
                },
                description: 'Optional structured payload object',
            },
            {
                displayName: 'Pages Spec (JSON)',
                name: 'pagesSpec',
                type: 'json',
                default: '[]',
                displayOptions: {
                    show: {
                        resource: ['preview'],
                        operation: ['livePreview'],
                    },
                },
                description: 'Optional pages specification (array)',
            },

            {
                displayName: 'Preview ID',
                name: 'previewId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['preview'],
                        operation: ['getHtml'],
                    },
                },
                description: 'Preview ID returned by Preview operations (X-Preview-ID)',
            },

            {
                displayName: 'Preview ID',
                name: 'previewId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['export', 'pdf'],
                    },
                },
                description: 'Preview ID returned by Preview operations (X-Preview-ID)',
            },

            {
                displayName: 'Label Format',
                name: 'labelFormat',
                type: 'options',
                options: [
                    { name: 'ZPL', value: 'zpl' },
                    { name: 'EPL2', value: 'epl2' },
                ],
                default: 'zpl',
                displayOptions: {
                    show: {
                        resource: ['label'],
                        operation: ['generate'],
                    },
                },
            },
            {
                displayName: 'File Key',
                name: 'fileKey',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['label'],
                        operation: ['generate'],
                    },
                },
                description: 'Figma file key',
            },
            {
                displayName: 'Frame',
                name: 'frame',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['label'],
                        operation: ['generate'],
                    },
                },
                description: 'Frame identifier/name to generate the label from',
            },
            {
                displayName: 'DPI',
                name: 'dpi',
                type: 'number',
                default: 203,
                displayOptions: {
                    show: {
                        resource: ['label'],
                        operation: ['generate'],
                    },
                },
            },
            {
                displayName: 'Missing',
                name: 'missing',
                type: 'options',
                options: [
                    { name: 'Ignore', value: 'ignore' },
                    { name: 'Empty', value: 'empty' },
                    { name: 'Error', value: 'error' },
                ],
                default: 'ignore',
                displayOptions: {
                    show: {
                        resource: ['label'],
                        operation: ['generate'],
                    },
                },
                description: 'How the server should handle missing merge fields',
            },
            {
                displayName: 'Merge (JSON)',
                name: 'mergePayload',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        resource: ['label'],
                        operation: ['generate'],
                    },
                },
                description: 'Merge payload object used for label generation',
            },

            {
                displayName: 'Frame',
                name: 'frame',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['fonts'],
                        operation: ['debug'],
                    },
                },
                description: 'Frame identifier/name',
            },

            {
                displayName: 'Diag',
                name: 'diag',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        resource: ['status'],
                        operation: ['status'],
                    },
                },
                description: 'Enable diagnostics in the status response (if supported by server)',
            },
            {
                displayName: 'Kind',
                name: 'kind',
                type: 'options',
                options: [
                    { name: 'PDF', value: 'pdf' },
                    { name: 'PNG', value: 'png' },
                    { name: 'HTML', value: 'html' },
                ],
                default: 'pdf',
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['export'],
                    },
                },
                description: 'Export kind/plugin',
            },
            {
                displayName: 'Filename',
                name: 'filename',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['export', 'pdf'],
                    },
                },
                description: 'Optional output filename (without extension)',
            },
            {
                displayName: 'Backend',
                name: 'backend',
                type: 'options',
                options: [
                    { name: 'Default', value: '' },
                    { name: 'WeasyPrint', value: 'weasyprint' },
                    { name: 'Krilla', value: 'krilla' },
                ],
                default: '',
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['export'],
                        kind: ['pdf'],
                    },
                },
                description: 'PDF backend selector when supported by the server',
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                displayOptions: {
                    show: {
                        resource: ['frames'],
                        operation: ['list'],
                    },
                },
                options: [
                    {
                        displayName: 'Hard Refresh',
                        name: 'hard',
                        type: 'boolean',
                        default: false,
                        description: 'Request frames with a hard refresh (bypass any server-side cache where supported)',
                    },
                    {
                        displayName: 'X-Figma-Token',
                        name: 'xFigmaToken',
                        type: 'string',
                        default: '',
                        description: 'Optional: override the Figma token used by the server for this request',
                    },
                ],
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                displayOptions: {
                    show: {
                        resource: ['preview'],
                        operation: ['livePreview'],
                    },
                },
                options: [
                    {
                        displayName: 'Mask Text',
                        name: 'maskText',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        displayName: 'Font Debug',
                        name: 'fontDebug',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        displayName: 'Reverse Order',
                        name: 'reverseOrder',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        displayName: 'Plugin Debug',
                        name: 'pluginDebug',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        displayName: 'X-Figma-Token',
                        name: 'xFigmaToken',
                        type: 'string',
                        default: '',
                        description: 'Optional: override the Figma token used by the server for this request',
                    },
                ],
            },

            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['export', 'pdf'],
                    },
                },
                options: [
                    {
                        displayName: 'X-Figma-Token',
                        name: 'xFigmaToken',
                        type: 'string',
                        default: '',
                        description: 'Optional: override the Figma token used by the server for this request',
                    },
                ],
            },

            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                displayOptions: {
                    show: {
                        resource: ['label', 'fonts', 'status'],
                    },
                },
                options: [
                    {
                        displayName: 'X-Figma-Token',
                        name: 'xFigmaToken',
                        type: 'string',
                        default: '',
                        description: 'Optional: override the Figma token used by the server for this request',
                    },
                ],
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const resource = this.getNodeParameter('resource', i) as string;
                const operation = this.getNodeParameter('operation', i) as string;

                if (resource === 'frames' && operation === 'list') {
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as {
                        hard?: boolean;
                        xFigmaToken?: string;
                    };

                    const response = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/frames',
                        qs: {
                            file_key: fileKey,
                            hard: optionsParam.hard ? 1 : undefined,
                        },
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'json',
                    });

                    returnData.push({
                        json: response as unknown as IDataObject,
                    });
                } else if (resource === 'preview' && operation === 'livePreview') {
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const frame = (this.getNodeParameter('frame', i, '') as string) || '';

                    const mergePayload = this.getNodeParameter('mergePayload', i, {}) as unknown;
                    const structuredPayload = this.getNodeParameter('structuredPayload', i, {}) as unknown;
                    const pagesSpec = this.getNodeParameter('pagesSpec', i, []) as unknown;

                    const optionsParam = this.getNodeParameter('options', i, {}) as {
                        maskText?: boolean;
                        fontDebug?: boolean;
                        reverseOrder?: boolean;
                        pluginDebug?: boolean;
                        xFigmaToken?: string;
                    };

                    const body: Record<string, unknown> = {
                        file_key: fileKey,
                    };

                    if (frame.trim() !== '') body.frame = frame;
                    if (mergePayload && typeof mergePayload === 'object' && Object.keys(mergePayload as object).length > 0) {
                        body.merge = mergePayload;
                    }
                    if (structuredPayload && typeof structuredPayload === 'object' && Object.keys(structuredPayload as object).length > 0) {
                        body.structured = structuredPayload;
                    }
                    if (pagesSpec) {
                        body.pages = pagesSpec;
                    }

                    if (optionsParam.maskText) body.maskText = true;
                    if (optionsParam.fontDebug) body.fontDebug = true;
                    if (optionsParam.reverseOrder) body.reverseOrder = true;
                    if (optionsParam.pluginDebug) body.pluginDebug = true;

                    const fullResponse = await figprintApiRequest.call(this, {
                        method: 'POST',
                        path: '/api/preview-live',
                        body,
                        sendJson: true,
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'text',
                        resolveWithFullResponse: true,
                    });

                    const responseAny = fullResponse as unknown as { body?: string; headers?: Record<string, string | string[] | undefined> };
                    const previewIdHeader = responseAny.headers?.['x-preview-id'] ?? responseAny.headers?.['X-Preview-ID'];
                    const previewId = Array.isArray(previewIdHeader) ? previewIdHeader[0] : previewIdHeader;

                    returnData.push({
                        json: {
                            previewId: previewId || undefined,
                            html: responseAny.body ?? '',
                        },
                    });

                } else if (resource === 'preview' && operation === 'getHtml') {
                    const previewId = this.getNodeParameter('previewId', i) as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };

                    const html = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/preview',
                        qs: {
                            preview_id: previewId,
                        },
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'text',
                    });

                    returnData.push({
                        json: {
                            previewId,
                            html: html as unknown as string,
                        },
                    });

                } else if (resource === 'export' && operation === 'export') {
                    const previewId = this.getNodeParameter('previewId', i) as string;
                    const kind = this.getNodeParameter('kind', i) as string;
                    const backend = this.getNodeParameter('backend', i) as string;
                    const filenameParam = this.getNodeParameter('filename', i, '') as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };

                    const fullResponse = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/export',
                        qs: {
                            kind,
                            preview_id: previewId,
                            filename: filenameParam.trim() !== '' ? filenameParam.trim() : undefined,
                            backend: kind === 'pdf' && backend ? backend : undefined,
                        },
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'binary',
                        resolveWithFullResponse: true,
                    });

                    const responseAny = fullResponse as unknown as { body?: Buffer; headers?: Record<string, string | string[] | undefined> };
                    const contentTypeHeader = responseAny.headers?.['content-type'] ?? responseAny.headers?.['Content-Type'];
                    const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;

                    const extByKind: Record<string, string> = { pdf: 'pdf', png: 'png', html: 'html' };
                    const defaultExt = extByKind[kind] ?? 'bin';
                    const baseName = filenameParam.trim() !== '' ? filenameParam.trim() : 'export';
                    const fileName = baseName.includes('.') ? baseName : `${baseName}.${defaultExt}`;

                    const binaryData = await this.helpers.prepareBinaryData(
                        responseAny.body ?? Buffer.from(''),
                        fileName,
                        contentType || (kind === 'pdf' ? 'application/pdf' : kind === 'png' ? 'image/png' : 'text/html'),
                    );

                    returnData.push({
                        binary: { data: binaryData },
                        json: {
                            kind,
                            previewId,
                            filename: fileName,
                            contentType: contentType || undefined,
                        },
                    });

                } else if (resource === 'export' && operation === 'pdf') {
                    const previewId = this.getNodeParameter('previewId', i) as string;
                    const filenameParam = this.getNodeParameter('filename', i, '') as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };

                    const fullResponse = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/pdf',
                        qs: {
                            preview_id: previewId,
                        },
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'binary',
                        resolveWithFullResponse: true,
                    });

                    const responseAny = fullResponse as unknown as { body?: Buffer; headers?: Record<string, string | string[] | undefined> };
                    const contentTypeHeader = responseAny.headers?.['content-type'] ?? responseAny.headers?.['Content-Type'];
                    const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;

                    const baseName = filenameParam.trim() !== '' ? filenameParam.trim() : 'output';
                    const fileName = baseName.endsWith('.pdf') ? baseName : `${baseName}.pdf`;

                    const binaryData = await this.helpers.prepareBinaryData(
                        responseAny.body ?? Buffer.from(''),
                        fileName,
                        contentType || 'application/pdf',
                    );

                    returnData.push({
                        binary: { data: binaryData },
                        json: {
                            kind: 'pdf',
                            previewId,
                            filename: fileName,
                            contentType: contentType || undefined,
                        },
                    });

                } else if (resource === 'label' && operation === 'generate') {
                    const labelFormat = this.getNodeParameter('labelFormat', i) as string;
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const frame = this.getNodeParameter('frame', i) as string;
                    const dpi = this.getNodeParameter('dpi', i) as number;
                    const missing = this.getNodeParameter('missing', i) as string;
                    const mergePayload = this.getNodeParameter('mergePayload', i, {}) as unknown;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };

                    const body: Record<string, unknown> = {
                        format: labelFormat,
                        file_key: fileKey,
                        frame,
                        dpi,
                        missing,
                        merge: mergePayload,
                    };

                    const labelText = await figprintApiRequest.call(this, {
                        method: 'POST',
                        path: '/api/label',
                        body,
                        sendJson: true,
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'text',
                    });

                    const fileName = `label.${labelFormat}.txt`;
                    const binaryData = await this.helpers.prepareBinaryData(
                        Buffer.from(String(labelText ?? ''), 'utf8'),
                        fileName,
                        'text/plain',
                    );

                    returnData.push({
                        binary: { data: binaryData },
                        json: {
                            format: labelFormat,
                            fileKey,
                            frame,
                            dpi,
                            missing,
                            filename: fileName,
                        },
                    });

                } else if (resource === 'fonts' && operation === 'list') {
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };
                    const response = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/fonts',
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'json',
                    });

                    returnData.push({
                        json: response as unknown as IDataObject,
                    });

                } else if (resource === 'fonts' && operation === 'debug') {
                    const frame = this.getNodeParameter('frame', i) as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };
                    const response = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/font-debug',
                        qs: {
                            frame,
                        },
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'json',
                    });

                    returnData.push({
                        json: response as unknown as IDataObject,
                    });

                } else if (resource === 'status' && operation === 'status') {
                    const diag = this.getNodeParameter('diag', i) as boolean;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };
                    const response = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/status',
                        qs: {
                            diag: diag ? 1 : undefined,
                        },
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'json',
                    });

                    returnData.push({
                        json: response as unknown as IDataObject,
                    });

                } else if (resource === 'status' && operation === 'config') {
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };
                    const response = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/config',
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'json',
                    });

                    returnData.push({
                        json: response as unknown as IDataObject,
                    });
                } else {
                    throw new NodeOperationError(this.getNode(), `The operation "${operation}" on resource "${resource}" is not supported.`);
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                } else {
                    throw new NodeOperationError(this.getNode(), error);
                }
            }
        }

        return [returnData];
    }
}


