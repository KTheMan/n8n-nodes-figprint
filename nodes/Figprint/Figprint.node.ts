import type {
    IDataObject,
    IExecuteFunctions,
    ILoadOptionsFunctions,
    INodeExecutionData,
    INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { figprintApiRequest } from './GenericFunctions';

export class Figprint implements INodeType {
    methods = {
        loadOptions: {
            async getFrames(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const fileKey = (this.getCurrentNodeParameter('fileKey') as string | undefined) ?? '';
                if (!fileKey || fileKey.trim() === '') {
                    return [];
                }

                const optionsParam = (this.getCurrentNodeParameter('options') as { xFigmaToken?: string } | undefined) ?? {};
                const response = await figprintApiRequest.call(this, {
                    method: 'GET',
                    path: '/api/frames',
                    qs: {
                        fileKey,
                    },
                    headers: {
                        'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                    },
                    responseType: 'json',
                    retry: { maxAttempts: 3 },
                });

                const framesRaw = (response as unknown as { frames?: Array<{ frameID?: string; id?: string; name?: string }> }).frames ?? [];
                const frameOptions: INodePropertyOptions[] = [];
                for (const frame of framesRaw) {
                    const value = frame.frameID ?? frame.id ?? '';
                    if (!value) continue;
                    frameOptions.push({
                        name: frame.name ?? value,
                        value,
                    });
                }

                return frameOptions;
            },
        },
    };

    description: INodeTypeDescription = {
        displayName: 'Figprint',
        name: 'figprint',
        group: ['transform'],
        version: 1,
        description: 'Render exports from FigPrint',
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
                noDataExpression: true,
                options: [
                    { name: 'Render', value: 'export' },
                    { name: 'Frame', value: 'frame' },
                ],
                default: 'export',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['export'],
                    },
                },
                options: [{ name: 'Render From File Key', value: 'exportFromFileKey', action: 'Render from file key' }],
                default: 'exportFromFileKey',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['frame'],
                    },
                },
                options: [
                    { name: 'List Frames', value: 'list', action: 'List frames' },
                    { name: 'Get Starter Payload', value: 'starterPayload', action: 'Get starter payload' },
                ],
                default: 'list',
            },
            {
                displayName: 'File Key',
                name: 'fileKey',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportFromFileKey'],
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
                        resource: ['frame'],
                        operation: ['list', 'starterPayload'],
                    },
                },
                description: 'Figma file key',
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
                        operation: ['exportFromFileKey'],
                    },
                },
                description: 'Output format',
            },
            {
                displayName: 'Filename',
                name: 'filename',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportFromFileKey'],
                    },
                },
                description: 'Optional output filename (without extension)',
            },
            {
                displayName: 'Payload (JSON)',
                name: 'payload',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportFromFileKey'],
                    },
                },
                description: 'Optional payload object passed to /api/export',
            },
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportFromFileKey'],
                    },
                },
                options: [
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
                        description: 'PDF backend selector (only used for PDF exports)',
                    },
                    {
                        displayName: 'Frame Name or ID',
                        name: 'frame',
                        type: 'options',
                        typeOptions: {
                            loadOptionsMethod: 'getFrames',
                        },
                        options: [{ name: 'Default', value: '' }],
                        default: '',
                        description:
                            'Optional: render a single frame. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                    },
                    {
                        displayName: 'Missing Strategy',
                        name: 'missing',
                        type: 'options',
                        options: [
                            { name: 'Keep', value: 'keep' },
                            { name: 'Blank', value: 'blank' },
                            { name: 'Dash', value: 'dash' },
                        ],
                        default: 'keep',
                        description: 'How to handle missing merge keys',
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
                        operation: ['exportFromFileKey'],
                    },
                },
                options: [
                    {
                        displayName: 'X-Figma-Token',
                        name: 'xFigmaToken',
                        type: 'string',
                        typeOptions: { password: true },
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
                        resource: ['frame'],
                        operation: ['list', 'starterPayload'],
                    },
                },
                options: [
                    {
                        displayName: 'Hard Refresh',
                        name: 'hard',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to request frames with a hard refresh (bypass any server-side cache where supported)',
                    },
                    {
                        displayName: 'X-Figma-Token',
                        name: 'xFigmaToken',
                        type: 'string',
                        typeOptions: { password: true },
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

                if (resource === 'frame' && operation === 'list') {
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as {
                        hard?: boolean;
                        xFigmaToken?: string;
                    };

                    const response = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/frames',
                        qs: {
                            fileKey,
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
                } else if (resource === 'frame' && operation === 'starterPayload') {
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as {
                        hard?: boolean;
                        xFigmaToken?: string;
                    };

                    const response = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/frames',
                        qs: {
                            fileKey,
                            hard: optionsParam.hard ? 1 : undefined,
                        },
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'json',
                        retry: { maxAttempts: 3 },
                    });

                    const starterPayload = (response as unknown as { starterPayload?: unknown }).starterPayload ?? {};

                    returnData.push({
                        json: {
                            fileKey,
                            starterPayload,
                        },
                    });
                } else if (resource === 'export' && operation === 'exportFromFileKey') {
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const kind = this.getNodeParameter('kind', i) as string;
                    const filenameParam = this.getNodeParameter('filename', i, '') as string;
                    const payloadParam = this.getNodeParameter('payload', i, {}) as unknown;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };
                    const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
                        backend?: string;
                        frame?: string;
                        missing?: 'keep' | 'blank' | 'dash';
                    };

                    const extByKind: Record<string, string> = { pdf: 'pdf', png: 'png', html: 'html' };
                    const defaultExt = extByKind[kind] ?? 'bin';
                    const baseName = filenameParam.trim() !== '' ? filenameParam.trim() : 'export';
                    const fileName = baseName.includes('.') ? baseName : `${baseName}.${defaultExt}`;

                    const frame = (additionalFields.frame ?? '').toString().trim();
                    const backend = (additionalFields.backend ?? '').toString().trim();
                    const missing = (additionalFields.missing ?? 'keep').toString().trim();

                    const hasPayload = payloadParam !== undefined && payloadParam !== null && payloadParam !== '';
                    const isObject = typeof payloadParam === 'object' && !Array.isArray(payloadParam);
                    const payloadObj = isObject ? (payloadParam as Record<string, unknown>) : {};
                    const bodyIsPreviewLike = hasPayload
                        ? [
                                'fileKey',
                                'file_key',
                                'frame',
                                'mergePayload',
                                'pagesSpec',
                                'structuredPayload',
                                'globalMerge',
                                'missing',
                          ].some((k) => k in payloadObj)
                        : false;

                    const requestMethod: 'GET' | 'POST' = hasPayload || (missing && missing !== 'keep') ? 'POST' : 'GET';

                    const qs: Record<string, string | number | boolean | undefined> = {
                        kind,
                        filename: fileName,
                        backend: kind === 'pdf' && backend ? backend : undefined,
                        frame: requestMethod === 'GET' && frame ? frame : undefined,
                        file_key: requestMethod === 'GET' ? fileKey : undefined,
                    };

                    let body: Record<string, unknown> | undefined;
                    let sendJson = false;

                    if (requestMethod === 'POST') {
                        sendJson = true;

                        if (hasPayload) {
                            body = { ...payloadObj };
                            if (bodyIsPreviewLike) {
                                if (!('fileKey' in body) && !('file_key' in body)) {
                                    body.fileKey = fileKey;
                                }
                                if (frame && !('frame' in body)) {
                                    body.frame = frame;
                                }
                                if (missing && missing !== 'keep' && !('missing' in body)) {
                                    body.missing = missing;
                                }
                            } else {
                                qs.file_key = fileKey;
                                if (frame) qs.frame = frame;
                            }
                        } else {
                            body = { fileKey };
                            if (missing && missing !== 'keep') body.missing = missing;
                            if (frame) body.frame = frame;
                        }
                    }

                    const exportFullResponse = await figprintApiRequest.call(this, {
                        method: requestMethod,
                        path: '/api/export',
                        qs,
                        body,
                        sendJson,
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'binary',
                        resolveWithFullResponse: true,
                    });

                    const exportAny = exportFullResponse as unknown as { body?: Buffer; headers?: Record<string, string | string[] | undefined> };
                    const contentTypeHeader = exportAny.headers?.['content-type'] ?? exportAny.headers?.['Content-Type'];
                    const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;

                    const binaryData = await this.helpers.prepareBinaryData(
                        exportAny.body ?? Buffer.from(''),
                        fileName,
                        contentType || (kind === 'pdf' ? 'application/pdf' : kind === 'png' ? 'image/png' : 'text/html'),
                    );

                    returnData.push({
                        binary: { data: binaryData },
                        json: {
                            kind,
                            fileKey,
                            frame: frame.trim() !== '' ? frame.trim() : undefined,
                            filename: fileName,
                            contentType: contentType || undefined,
                        },
                    });
                } else {
                    throw new NodeOperationError(this.getNode(), `The operation "${operation}" on resource "${resource}" is not supported.`);
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: (error as Error).message } });
                } else {
                    throw new NodeOperationError(this.getNode(), error);
                }
            }
        }

        return [returnData];
    }
}

/*
                    { name: 'List Frames', value: 'list', action: 'List frames' },
                    { name: 'Get Starter Payload', value: 'starterPayload', action: 'Get starter payload' },
                ],
                default: 'list',
            },
            {
                    { name: 'Default', value: '' },
                ],
                default: '',
                displayOptions: {
                    show: {
                        resource: ['preview'],
                        operation: ['livePreview'],
                    },
                },
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
                displayName: 'Preview ID',
                name: 'previewId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportPost'],
                        kind: ['pdf', 'png', 'html'],
                    },
                },
                description: 'Preview ID returned by Preview operations (X-Preview-ID). Required for non-label exports.',
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
                displayName: 'Frame Name or ID',
                name: 'frame',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getFrames',
                },
                options: [],
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['label'],
                        operation: ['generate'],
                    },
                },
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
                    { name: 'Keep', value: 'keep' },
                    { name: 'Blank', value: 'blank' },
                    { name: 'Dash', value: 'dash' },
                ],
                default: 'keep',
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
                displayName: 'Kind',
                name: 'kind',
                type: 'options',
                options: [
                    { name: 'PDF', value: 'pdf' },
                    { name: 'PNG', value: 'png' },
                    { name: 'HTML', value: 'html' },
                    { name: 'Label', value: 'label' },
                ],
                default: 'pdf',
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportPost'],
                    },
                },
                description: 'Export kind/plugin (POST allows a request body; label export supports merge payload)',
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
                        resource: ['export'],
                        operation: ['exportPost'],
                        kind: ['label'],
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
                        resource: ['export'],
                        operation: ['exportPost'],
                        kind: ['label'],
                    },
                },
                description: 'Figma file key (required for label export)',
            },
            {
                displayName: 'Frame Name or ID',
                name: 'frame',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getFrames',
                },
                options: [],
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportPost'],
                        kind: ['label'],
                    },
                },
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
            },
            {
                displayName: 'DPI',
                name: 'dpi',
                type: 'number',
                default: 203,
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportPost'],
                        kind: ['label'],
                    },
                },
            },
            {
                displayName: 'Missing',
                name: 'missing',
                type: 'options',
                options: [
                    { name: 'Keep', value: 'keep' },
                    { name: 'Blank', value: 'blank' },
                    { name: 'Dash', value: 'dash' },
                ],
                default: 'keep',
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportPost'],
                        kind: ['label'],
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
                        resource: ['export'],
                        operation: ['exportPost'],
                        kind: ['label'],
                    },
                },
                description: 'Merge payload object used for label export',
            },

            {
                displayName: 'Export Body (JSON)',
                name: 'exportBody',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportPost'],
                        kind: ['pdf', 'png', 'html'],
                    },
                },
                description: 'Optional JSON body for exporters that accept a POST body (future-proofing). Ignored by most built-in exporters.',
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
                description: 'Whether to enable diagnostics in the status response (if supported by server)',
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
                        operation: ['export', 'exportFromFileKey'],
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
                        operation: ['export', 'exportPost', 'pdf', 'exportFromFileKey'],
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
                        operation: ['export', 'exportPost'],
                        kind: ['pdf'],
                    },
                },
                description: 'PDF backend selector when supported by the server',
            },

            {
                displayName: 'File Key',
                name: 'fileKey',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportFromFileKey'],
                    },
                },
                description: 'Figma file key',
            },

            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                displayOptions: {
                    show: {
                        resource: ['export'],
                        operation: ['exportFromFileKey'],
                    },
                },
                options: [
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
                        description: 'PDF backend selector (only used for PDF exports)',
                    },
                    {
                        displayName: 'Export Body (JSON)',
                        name: 'exportBody',
                        type: 'json',
                        default: '{}',
                        description: 'Optional raw JSON body for POST /api/export. If the body does not include fileKey/file_key, the node will send file_key in the query string.',
                    },
                    {
                        displayName: 'Font Debug',
                        name: 'fontDebug',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to enable font debugging (preview-related flag; typically not applied to exported output)',
                    },
                    {
                        displayName: 'Frame Name or ID',
                        name: 'frame',
                        type: 'options',
                        typeOptions: {
                            loadOptionsMethod: 'getFrames',
                        },
                        options: [
                            { name: 'Default', value: '' },
                        ],
                        default: '',
                        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                    },
                    {
                        displayName: 'Global Merge (JSON)',
                        name: 'globalMerge',
                        type: 'json',
                        default: '{}',
                        description: 'Optional global merge object used with pagesSpec (applied to each page unless overridden)',
                    },
                    {
                        displayName: 'Mask Text',
                        name: 'maskText',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to mask text (preview-related flag; typically not applied to exported output)',
                    },
                    {
                        displayName: 'Merge Payload (JSON)',
                        name: 'mergePayload',
                        type: 'json',
                        default: '{}',
                        description: 'Optional merge payload object used for one-shot exports (single frame) or preview-live shaped requests',
                    },
                    {
                        displayName: 'Missing Strategy',
                        name: 'missing',
                        type: 'options',
                        options: [
                            { name: 'Keep', value: 'keep' },
                            { name: 'Blank', value: 'blank' },
                            { name: 'Dash', value: 'dash' },
                        ],
                        default: 'keep',
                        description: 'How to handle missing merge keys',
                    },
                    {
                        displayName: 'Pages Spec (JSON)',
                        name: 'pagesSpec',
                        type: 'json',
                        default: '[]',
                        description: 'Optional pages specification array (advanced multi-page composition)',
                    },
                    {
                        displayName: 'Plugin Debug',
                        name: 'pluginDebug',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to enable plugin debugging (preview-related flag; typically not applied to exported output)',
                    },
                    {
                        displayName: 'Reverse Order',
                        name: 'reverseOrder',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to reverse the render order of pages in the request',
                    },
                    {
                        displayName: 'Structured Payload (JSON)',
                        name: 'structuredPayload',
                        type: 'json',
                        default: '{}',
                        description: 'Optional structured payload object for multi-page composition',
                    },
                ],
            },

            {
                displayName: 'File Key',
                name: 'fileKey',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['generate'],
                        operation: ['generate', 'generateMulti'],
                    },
                },
                description: 'Figma file key',
            },
            {
                displayName: 'Frame Name or ID',
                name: 'frame',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getFrames',
                },
                options: [
                    { name: 'Default', value: '' },
                ],
                default: '',
                displayOptions: {
                    show: {
                        resource: ['generate'],
                        operation: ['generate'],
                    },
                },
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
            },
            {
                displayName: 'Payload (JSON)',
                name: 'payload',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        resource: ['generate'],
                        operation: ['generate'],
                    },
                },
                description: 'Optional payload object (single-frame generation)',
            },
            {
                displayName: 'Missing',
                name: 'missing',
                type: 'options',
                options: [
                    { name: 'Keep', value: 'keep' },
                    { name: 'Blank', value: 'blank' },
                    { name: 'Dash', value: 'dash' },
                ],
                default: 'keep',
                displayOptions: {
                    show: {
                        resource: ['generate'],
                        operation: ['generate', 'generateMulti'],
                    },
                },
                description: 'How the server should handle missing merge fields',
            },
            {
                displayName: 'Pages (JSON)',
                name: 'pages',
                type: 'json',
                default: '[]',
                displayOptions: {
                    show: {
                        resource: ['generate'],
                        operation: ['generateMulti'],
                    },
                },
                description: 'Optional list of frame IDs/names to include',
            },
            {
                displayName: 'Order (JSON)',
                name: 'order',
                type: 'json',
                default: '[]',
                displayOptions: {
                    show: {
                        resource: ['generate'],
                        operation: ['generateMulti'],
                    },
                },
                description: 'Optional explicit ordering list of frame IDs/names',
            },
            {
                displayName: 'Duplicates (JSON)',
                name: 'duplicates',
                type: 'json',
                default: '[]',
                displayOptions: {
                    show: {
                        resource: ['generate'],
                        operation: ['generateMulti'],
                    },
                },
                description: 'Optional duplicates directive array (see FigPrint docs)',
            },
            {
                displayName: 'Merge Payloads (JSON)',
                name: 'mergePayloads',
                type: 'json',
                default: '[]',
                displayOptions: {
                    show: {
                        resource: ['generate'],
                        operation: ['generateMulti'],
                    },
                },
                description: 'Optional list of per-page merge payloads aligned to final pages',
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
                        operation: ['list', 'starterPayload'],
                    },
                },
                options: [
                    {
                        displayName: 'Hard Refresh',
                        name: 'hard',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to request frames with a hard refresh (bypass any server-side cache where supported)',
                    },
                    {
                        displayName: 'X-Figma-Token',
                        name: 'xFigmaToken',
                        type: 'string',
                        typeOptions: { password: true },
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
                        displayName: 'Font Debug',
                        name: 'fontDebug',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to enable font debugging in the preview response',
                    },
                    {
                        displayName: 'Mask Text',
                        name: 'maskText',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to mask text in the preview output',
                    },
                    {
                        displayName: 'Plugin Debug',
                        name: 'pluginDebug',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to enable plugin debugging in the preview response',
                    },
                    {
                        displayName: 'Reverse Order',
                        name: 'reverseOrder',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to reverse the render order of preview pages',
                    },
                    {
                        displayName: 'X-Figma-Token',
                        name: 'xFigmaToken',
                        type: 'string',
                        typeOptions: { password: true },
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
                        operation: ['export', 'exportPost', 'pdf', 'exportFromFileKey'],
                    },
                },
                options: [
                    {
                        displayName: 'X-Figma-Token',
                        name: 'xFigmaToken',
                        type: 'string',
                        typeOptions: { password: true },
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
                        resource: ['generate', 'label', 'fonts', 'status'],
                    },
                },
                options: [
                    {
                        displayName: 'X-Figma-Token',
                        name: 'xFigmaToken',
                        type: 'string',
                        typeOptions: { password: true },
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
                            fileKey,
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

                } else if (resource === 'frames' && operation === 'starterPayload') {
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as {
                        hard?: boolean;
                        xFigmaToken?: string;
                    };

                    const response = await figprintApiRequest.call(this, {
                        method: 'GET',
                        path: '/api/frames',
                        qs: {
                            fileKey,
                            hard: optionsParam.hard ? 1 : undefined,
                        },
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'json',
                        retry: { maxAttempts: 3 },
                    });

                    const starterPayload = (response as unknown as { starterPayload?: unknown }).starterPayload ?? {};

                    returnData.push({
                        json: {
                            fileKey,
                            starterPayload,
                        },
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
                        fileKey,
                    };

                    if (frame.trim() !== '') body.frame = frame;
                    if (mergePayload && typeof mergePayload === 'object' && Object.keys(mergePayload as object).length > 0) {
                        body.mergePayload = mergePayload;
                    }
                    if (structuredPayload && typeof structuredPayload === 'object' && Object.keys(structuredPayload as object).length > 0) {
                        body.structuredPayload = structuredPayload;
                    }
                    if (pagesSpec) {
                        body.pagesSpec = pagesSpec;
                    }

                    if (optionsParam.maskText) body.maskText = 1;
                    if (optionsParam.fontDebug) body.fontDebug = 1;
                    if (optionsParam.reverseOrder) body.reverseOrder = true;
                    if (optionsParam.pluginDebug) body.pluginDebug = 1;

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

                } else if (resource === 'export' && operation === 'exportFromFileKey') {
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const kind = this.getNodeParameter('kind', i) as string;
                    const filenameParam = this.getNodeParameter('filename', i, '') as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };
                    const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
                        backend?: string;
                        exportBody?: unknown;
                        fontDebug?: boolean;
                        frame?: string;
                        globalMerge?: unknown;
                        maskText?: boolean;
                        mergePayload?: unknown;
                        missing?: 'keep' | 'blank' | 'dash';
                        pagesSpec?: unknown;
                        pluginDebug?: boolean;
                        reverseOrder?: boolean;
                        structuredPayload?: unknown;
                    };

                    const extByKind: Record<string, string> = { pdf: 'pdf', png: 'png', html: 'html' };
                    const defaultExt = extByKind[kind] ?? 'bin';
                    const baseName = filenameParam.trim() !== '' ? filenameParam.trim() : 'export';
                    const fileName = baseName.includes('.') ? baseName : `${baseName}.${defaultExt}`;

                    const frame = (additionalFields.frame ?? '').toString().trim();
                    const backend = (additionalFields.backend ?? '').toString().trim();

                    const previewLikeBody: Record<string, unknown> = { fileKey };
                    if (frame !== '') previewLikeBody.frame = frame;

                    const missing = (additionalFields.missing ?? 'keep').toString().trim();
                    if (missing && missing !== 'keep') previewLikeBody.missing = missing;

                    const mergePayload = additionalFields.mergePayload;
                    if (mergePayload && typeof mergePayload === 'object' && Object.keys(mergePayload as object).length > 0) {
                        previewLikeBody.mergePayload = mergePayload;
                    }

                    const structuredPayload = additionalFields.structuredPayload;
                    if (structuredPayload && typeof structuredPayload === 'object' && Object.keys(structuredPayload as object).length > 0) {
                        previewLikeBody.structuredPayload = structuredPayload;
                    }

                    const globalMerge = additionalFields.globalMerge;
                    if (globalMerge && typeof globalMerge === 'object' && Object.keys(globalMerge as object).length > 0) {
                        previewLikeBody.globalMerge = globalMerge;
                    }

                    const pagesSpec = additionalFields.pagesSpec;
                    if (Array.isArray(pagesSpec) && pagesSpec.length > 0) {
                        previewLikeBody.pagesSpec = pagesSpec;
                    } else if (pagesSpec && typeof pagesSpec === 'object' && Object.keys(pagesSpec as object).length > 0) {
                        previewLikeBody.pagesSpec = pagesSpec;
                    }

                    if (additionalFields.maskText) previewLikeBody.maskText = 1;
                    if (additionalFields.fontDebug) previewLikeBody.fontDebug = 1;
                    if (additionalFields.reverseOrder) previewLikeBody.reverseOrder = true;
                    if (additionalFields.pluginDebug) previewLikeBody.pluginDebug = 1;

                    const exportBodyRaw = additionalFields.exportBody;
                    const exportBodyObj = exportBodyRaw && typeof exportBodyRaw === 'object' ? (exportBodyRaw as Record<string, unknown>) : {};
                    const hasExportBody = exportBodyObj && Object.keys(exportBodyObj).length > 0;

                    const hasPreviewLikeBody = Object.keys(previewLikeBody).length > 1;

                    const bodyIsPreviewLike = hasExportBody
                        ? ['fileKey', 'file_key', 'frame', 'mergePayload', 'pagesSpec', 'structuredPayload', 'globalMerge', 'missing', 'reverseOrder', 'maskText', 'fontDebug', 'pluginDebug'].some(
                                (k) => k in exportBodyObj,
                          )
                        : false;

                    const requestMethod: 'GET' | 'POST' = hasExportBody || hasPreviewLikeBody ? 'POST' : 'GET';

                    const qs: Record<string, string | number | boolean | undefined> = {
                        kind,
                        filename: fileName,
                        backend: kind === 'pdf' && backend ? backend : undefined,
                        frame: requestMethod === 'GET' && frame ? frame : undefined,
                        file_key: requestMethod === 'GET' ? fileKey : undefined,
                    };

                    let body: Record<string, unknown> | undefined;
                    let sendJson = false;

                    if (requestMethod === 'POST') {
                        sendJson = true;

                        if (hasExportBody) {
                            // If the body looks like a preview-live request, ensure it includes fileKey.
                            // Otherwise, treat it as a merge-payload object and pass file_key in query.
                            if (bodyIsPreviewLike) {
                                if (!('fileKey' in exportBodyObj) && !('file_key' in exportBodyObj)) {
                                    exportBodyObj.fileKey = fileKey;
                                }
                                body = exportBodyObj;
                            } else {
                                qs.file_key = fileKey;
                                if (frame) qs.frame = frame;
                                body = exportBodyObj;
                            }
                        } else {
                            // Use preview-live-like shape for one-shot exports with advanced inputs.
                            body = previewLikeBody;
                        }
                    }

                    const exportFullResponse = await figprintApiRequest.call(this, {
                        method: requestMethod,
                        path: '/api/export',
                        qs,
                        body,
                        sendJson,
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'binary',
                        resolveWithFullResponse: true,
                    });

                    const exportAny = exportFullResponse as unknown as { body?: Buffer; headers?: Record<string, string | string[] | undefined> };
                    const contentTypeHeader = exportAny.headers?.['content-type'] ?? exportAny.headers?.['Content-Type'];
                    const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;

                    const binaryData = await this.helpers.prepareBinaryData(
                        exportAny.body ?? Buffer.from(''),
                        fileName,
                        contentType || (kind === 'pdf' ? 'application/pdf' : kind === 'png' ? 'image/png' : 'text/html'),
                    );

                    returnData.push({
                        binary: { data: binaryData },
                        json: {
                            kind,
                            fileKey,
                            frame: frame.trim() !== '' ? frame.trim() : undefined,
                            filename: fileName,
                            contentType: contentType || undefined,
                        },
                    });

                } else if (resource === 'export' && operation === 'exportPost') {
                    const kind = this.getNodeParameter('kind', i) as string;
                    const backend = this.getNodeParameter('backend', i, '') as string;
                    const filenameParam = this.getNodeParameter('filename', i, '') as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };

                    if (kind === 'label') {
                        const labelFormat = this.getNodeParameter('labelFormat', i) as string;
                        const fileKey = this.getNodeParameter('fileKey', i) as string;
                        const frame = this.getNodeParameter('frame', i) as string;
                        const dpi = this.getNodeParameter('dpi', i) as number;
                        const missing = this.getNodeParameter('missing', i) as string;
                        const mergePayload = this.getNodeParameter('mergePayload', i, {}) as unknown;

                        const qs: Record<string, string | number | boolean | undefined> = {
                            kind,
                            format: labelFormat,
                            file_key: fileKey,
                            frame,
                            dpi,
                            missing,
                            filename: filenameParam.trim() !== '' ? filenameParam.trim() : undefined,
                        };

                        const body = mergePayload && typeof mergePayload === 'object' ? (mergePayload as Record<string, unknown>) : {};

                        const fullResponse = await figprintApiRequest.call(this, {
                            method: 'POST',
                            path: '/api/export',
                            qs,
                            body,
                            sendJson: true,
                            headers: {
                                'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                            },
                            responseType: 'binary',
                            resolveWithFullResponse: true,
                        });

                        const responseAny = fullResponse as unknown as { body?: Buffer; headers?: Record<string, string | string[] | undefined> };
                        const contentTypeHeader = responseAny.headers?.['content-type'] ?? responseAny.headers?.['Content-Type'];
                        const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;

                        const defaultExt = labelFormat === 'epl2' ? 'epl' : 'zpl';
                        const baseName = filenameParam.trim() !== '' ? filenameParam.trim() : 'label';
                        const fileName = baseName.includes('.') ? baseName : `${baseName}.${defaultExt}`;

                        const binaryData = await this.helpers.prepareBinaryData(
                            responseAny.body ?? Buffer.from(''),
                            fileName,
                            contentType || 'text/plain',
                        );

                        returnData.push({
                            binary: { data: binaryData },
                            json: {
                                kind,
                                format: labelFormat,
                                fileKey,
                                frame,
                                dpi,
                                missing,
                                filename: fileName,
                                contentType: contentType || undefined,
                            },
                        });
                    } else {
                        const previewId = this.getNodeParameter('previewId', i) as string;
                        const exportBody = this.getNodeParameter('exportBody', i, {}) as unknown;

                        const qs: Record<string, string | number | boolean | undefined> = {
                            kind,
                            preview_id: previewId,
                            filename: filenameParam.trim() !== '' ? filenameParam.trim() : undefined,
                            backend: kind === 'pdf' && backend ? backend : undefined,
                        };

                        const bodyObj = exportBody && typeof exportBody === 'object' ? (exportBody as Record<string, unknown>) : {};
                        const hasBody = bodyObj && Object.keys(bodyObj).length > 0;

                        const fullResponse = await figprintApiRequest.call(this, {
                            method: 'POST',
                            path: '/api/export',
                            qs,
                            body: hasBody ? bodyObj : undefined,
                            sendJson: hasBody,
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
                    }

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

                } else if (resource === 'generate' && operation === 'generate') {
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const frame = (this.getNodeParameter('frame', i, '') as string) || '';
                    const payload = this.getNodeParameter('payload', i, {}) as unknown;
                    const missing = this.getNodeParameter('missing', i, 'keep') as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };

                    const body: Record<string, unknown> = {
                        fileKey,
                    };
                    if (frame.trim() !== '') body.frame = frame;
                    if (payload && typeof payload === 'object' && Object.keys(payload as object).length > 0) {
                        body.payload = payload;
                    }
                    // Some FigPrint builds accept/use this; harmless if ignored.
                    if (missing) body.missing = missing;

                    const response = await figprintApiRequest.call(this, {
                        method: 'POST',
                        path: '/api/generate',
                        body,
                        sendJson: true,
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'json',
                    });

                    returnData.push({
                        json: response as unknown as IDataObject,
                    });

                } else if (resource === 'generate' && operation === 'generateMulti') {
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const pages = this.getNodeParameter('pages', i, []) as unknown;
                    const order = this.getNodeParameter('order', i, []) as unknown;
                    const duplicates = this.getNodeParameter('duplicates', i, []) as unknown;
                    const mergePayloads = this.getNodeParameter('mergePayloads', i, []) as unknown;
                    const missing = this.getNodeParameter('missing', i, 'keep') as string;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };

                    const body: Record<string, unknown> = {
                        fileKey,
                        missing,
                    };
                    if (Array.isArray(pages) && pages.length > 0) body.pages = pages;
                    if (Array.isArray(order) && order.length > 0) body.order = order;
                    if (Array.isArray(duplicates) && duplicates.length > 0) body.duplicates = duplicates;
                    if (Array.isArray(mergePayloads) && mergePayloads.length > 0) body.mergePayloads = mergePayloads;

                    const response = await figprintApiRequest.call(this, {
                        method: 'POST',
                        path: '/api/generate-multi',
                        body,
                        sendJson: true,
                        headers: {
                            'X-Figma-Token': optionsParam.xFigmaToken?.trim() || undefined,
                        },
                        responseType: 'json',
                    });

                    returnData.push({
                        json: response as unknown as IDataObject,
                    });

                } else if (resource === 'label' && operation === 'generate') {
                    const labelFormat = this.getNodeParameter('labelFormat', i) as string;
                    const fileKey = this.getNodeParameter('fileKey', i) as string;
                    const frame = this.getNodeParameter('frame', i) as string;
                    const dpi = this.getNodeParameter('dpi', i) as number;
                    const missing = this.getNodeParameter('missing', i) as string;
                    const mergePayload = this.getNodeParameter('mergePayload', i, {}) as unknown;
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };

                    const qs: Record<string, string | number | boolean | undefined> = {
                        format: labelFormat,
                        file_key: fileKey,
                        frame,
                        dpi,
                        missing,
                    };

                    const body = mergePayload && typeof mergePayload === 'object' ? (mergePayload as Record<string, unknown>) : {};

                    const labelText = await figprintApiRequest.call(this, {
                        method: 'POST',
                        path: '/api/label',
                        qs,
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

*/


