import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export type FigprintCredentials = {
	baseUrl: string;
	token?: string;
	xFigmaToken?: string;
};

type FigprintRequestContext = IExecuteFunctions | ILoadOptionsFunctions;

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
	this: FigprintRequestContext,
	options: {
		method: 'GET' | 'POST';
		path: string;
		qs?: Record<string, string | number | boolean | undefined>;
		body?: unknown;
		headers?: Record<string, string | undefined>;
		responseType?: 'json' | 'text' | 'binary';
		sendJson?: boolean;
		resolveWithFullResponse?: boolean;
		retry?: {
			maxAttempts: number;
		};
	},
): Promise<T> {
	const credentials = (await this.getCredentials('figprintApi')) as FigprintCredentials | undefined;
	if (!credentials?.baseUrl) {
		throw new NodeOperationError(
			this.getNode(),
			'Missing Figprint credentials. Please configure Figprint API credentials (Base URL).',
		);
	}

	const url = `${normalizeBaseUrl(credentials.baseUrl)}${options.path.startsWith('/') ? '' : '/'}${options.path}`;

	const headers: Record<string, string> = {};
	if (credentials.token) {
		headers.Authorization = `Bearer ${credentials.token}`;
	}

	// Apply credential-level X-Figma-Token by default, unless explicitly overridden per request
	if (credentials.xFigmaToken && credentials.xFigmaToken.trim() !== '') {
		headers['X-Figma-Token'] = credentials.xFigmaToken.trim();
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

	const maxAttempts = options.retry?.maxAttempts ?? 1;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return (await this.helpers.request(requestOptions as any)) as T;
		} catch (error) {
		// n8n request errors usually contain statusCode + response.body
		const maybeAny = error as {
			statusCode?: number;
			response?: { body?: unknown; headers?: Record<string, string | string[] | undefined> };
		};
		const statusCode = maybeAny?.statusCode;
		const responseBody = maybeAny?.response?.body;
		const responseHeaders = maybeAny?.response?.headers;

		if (statusCode === 429 && attempt < maxAttempts) {
			const retryAfterHeader = responseHeaders?.['retry-after'] ?? responseHeaders?.['Retry-After'];
			const retryAfterRaw = Array.isArray(retryAfterHeader) ? retryAfterHeader[0] : retryAfterHeader;
			const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : NaN;
			const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 1000;
			await new Promise((resolve) => setTimeout(resolve, waitMs));
			continue;
		}

		const details = responseBody ? ` Response: ${typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)}` : '';

		if (statusCode) {
			const label =
				statusCode === 400 ? 'Bad request' :
				statusCode === 401 ? 'Unauthorized' :
				statusCode === 403 ? 'Forbidden' :
				statusCode === 404 ? 'Not found' :
				statusCode === 429 ? 'Rate limited' :
				statusCode === 502 ? 'Bad gateway' :
				'HTTP error';

			throw new NodeOperationError(
				this.getNode(),
				`Figprint API request failed (${statusCode} ${label}).${details}`,
			);
		}

		throw new NodeOperationError(this.getNode(), `Figprint API request failed. ${toErrorMessage(error)}`);
		}
	}

	throw new NodeOperationError(this.getNode(), 'Figprint API request failed after retries.');
}
