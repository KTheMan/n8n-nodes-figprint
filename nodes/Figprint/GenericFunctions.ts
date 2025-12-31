import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export type FigprintCredentials = {
	baseUrl: string;
	token?: string;
	// reserved for future: defaultXFigmaToken?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, '');
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) return error.message;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

export async function figprintApiRequest<T>(
	this: IExecuteFunctions,
	options: {
		method: 'GET' | 'POST';
		path: string;
		qs?: Record<string, string | number | boolean | undefined>;
		body?: unknown;
		headers?: Record<string, string | undefined>;
		responseType?: 'json' | 'text' | 'binary';
		sendJson?: boolean;
		resolveWithFullResponse?: boolean;
	},
): Promise<T> {
	const credentials = (await this.getCredentials('figprintApi')) as FigprintCredentials | undefined;
	if (!credentials?.baseUrl) {
		throw new NodeOperationError(
			this.getNode(),
			'Missing Figprint credentials. Please configure Figprint API credentials (Base URL + API Token).',
		);
	}

	const url = `${normalizeBaseUrl(credentials.baseUrl)}${options.path.startsWith('/') ? '' : '/'}${options.path}`;

	const headers: Record<string, string> = {};
	if (credentials.token) {
		headers.Authorization = `Bearer ${credentials.token}`;
	}

	for (const [key, value] of Object.entries(options.headers ?? {})) {
		if (value !== undefined && value !== '') headers[key] = value;
	}

	const requestOptions: Record<string, unknown> = {
		method: options.method,
		url,
		headers,
		qs: options.qs,
	};

	const responseType = options.responseType ?? 'json';
	const sendJson = options.sendJson ?? (options.method === 'POST');

	// Response handling
	if (responseType === 'binary') {
		requestOptions.encoding = null;
		requestOptions.json = false;
	} else if (responseType === 'text') {
		requestOptions.json = false;
	} else {
		requestOptions.json = true;
	}

	// Request body handling (POST)
	if (options.method === 'POST') {
		const body = options.body ?? {};
		if (sendJson) {
			// If we need a non-JSON response (e.g. HTML), we must not set json=true,
			// otherwise the response will be parsed.
			if (responseType === 'json') {
				requestOptions.body = body;
				requestOptions.json = true;
			} else {
				requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
				headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
			}
		} else {
			requestOptions.body = body;
		}
	}

	if (options.resolveWithFullResponse === true) {
		requestOptions.resolveWithFullResponse = true;
	}

	try {
		return (await this.helpers.request(requestOptions as any)) as T;
	} catch (error) {
		// n8n request errors usually contain statusCode + response.body
		const maybeAny = error as { statusCode?: number; response?: { body?: unknown } };
		const statusCode = maybeAny?.statusCode;
		const responseBody = maybeAny?.response?.body;

		const details = responseBody ? ` Response: ${typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)}` : '';

		if (statusCode) {
			throw new NodeOperationError(
				this.getNode(),
				`Figprint API request failed (${statusCode}).${details}`,
			);
		}

		throw new NodeOperationError(this.getNode(), `Figprint API request failed. ${toErrorMessage(error)}`);
	}
}
