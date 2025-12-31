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
            default: 'https://figprint',
            placeholder: 'https://figprint',
            required: true,
            description: 'Base URL of your Figprint instance (self-hosted).',
        },
        {
            displayName: 'API Token',
            name: 'token',
            type: 'string',
            default: '',
            required: true,
            typeOptions: {
                password: true,
            },
            description: 'Your Figprint API token.',
        },
    ];

    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.token}}',
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



