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

import { figprintApiRequest } from '../GenericFunctions';

export class FigprintV2 implements INodeType {
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
        version: 2,
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
                        description:
                            'Optional raw JSON body for POST /api/export. If the body does not include fileKey/file_key, the node will send file_key in the query string.',
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
                        displayName: 'Global Merge (JSON)',
                        name: 'globalMerge',
                        type: 'json',
                        default: '{}',
                        description: 'Optional global merge object used with pagesSpec',
                    },
                    {
                        displayName: 'Merge Payload (JSON)',
                        name: 'mergePayload',
                        type: 'json',
                        default: '{}',
                        description: 'Optional merge payload object used for one-shot renders',
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
                        displayName: 'Structured Payload (JSON)',
                        name: 'structuredPayload',
                        type: 'json',
                        default: '{}',
                        description: 'Optional structured payload object used for one-shot renders',
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
                    const optionsParam = this.getNodeParameter('options', i, {}) as { xFigmaToken?: string };
                    const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
                        backend?: string;
                        exportBody?: unknown;
                        frame?: string;
                        globalMerge?: unknown;
                        mergePayload?: unknown;
                        missing?: 'keep' | 'blank' | 'dash';
                        pagesSpec?: unknown;
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

                    const exportBodyRaw = additionalFields.exportBody;
                    const exportBodyObj = exportBodyRaw && typeof exportBodyRaw === 'object' ? (exportBodyRaw as Record<string, unknown>) : {};
                    const hasExportBody = exportBodyObj && Object.keys(exportBodyObj).length > 0;

                    const hasPreviewLikeBody = Object.keys(previewLikeBody).length > 1;

                    const bodyIsPreviewLike = hasExportBody
                        ? [
                                'fileKey',
                                'file_key',
                                'frame',
                                'mergePayload',
                                'pagesSpec',
                                'structuredPayload',
                                'globalMerge',
                                'missing',
                          ].some((k) => k in exportBodyObj)
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
