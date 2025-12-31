import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FigprintApi implements ICredentialType {
    name = 'figprintApi';
    displayName = 'Figprint API';
    documentationUrl = 'https://docs.figprint.cc/api.html';
    properties: INodeProperties[] = [
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: 'http://localhost:8000',
            placeholder: 'http://localhost:8000',
            required: true,
            description: 'Base URL of your Figprint instance (cloud or self-hosted).',
        },
        {
            displayName: 'API Token',
            name: 'token',
            type: 'string',
            default: '',
            required: false,
            typeOptions: {
                password: true,
            },
            description: 'Optional: Figprint API token (Bearer). Leave empty only if your server allows anonymous access.',
        },
        {
            displayName: 'Default X-Figma-Token',
            name: 'xFigmaToken',
            type: 'string',
            default: '',
            required: false,
            typeOptions: {
                password: true,
            },
            description: 'Optional: default Figma token sent as X-Figma-Token (can be overridden per operation).',
        },
    ];

    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '={{ $credentials.token ? `Bearer ${$credentials.token}` : undefined }}',
            },
        },
    } as const;

    test = {
        request: {
            baseURL: '={{$credentials.baseUrl}}',
            url: '/api/status',
        },
    } as const;
}



