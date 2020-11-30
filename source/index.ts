import got from 'got';
import * as AWS from 'aws-sdk';
import * as aws4 from 'aws4';

// Name of the header used for X-ray tracing
const XRAY_TRACE_HEADER = 'x-amzn-trace-id';

export interface GotAWSOptions {
	/**
	 * A provider or a list of providers used to search for AWS credentials. If no providers are provided,
	 * it will use the [EnvironmentCredentials](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EnvironmentCredentials.html) provider.
	 *
	 * See the [CredentialProviderChain](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CredentialProviderChain.html) documentation for more information.
	 */
	providers?: AWS.Credentials | AWS.Credentials[];

	/**
	 * The AWS service the request is being signed for. Will try to be inferred by the URL if not provided.
	 *
	 * For example, when signing a request for API Gateway with a custom domain, this should be `execute-api`.
	 */
	service?: string;

	/**
	 * The region of the service being invoked. If it could not be inferred through the URL, it will default to `us-east-1`.
	 */
	region?: string;
}

/**
 * Create a Got instance which will automatically sign the requests with a [AWS Version 4 signature](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html).
 *
 * @param awsOptions - A provider or a list of providers used to search for AWS credentials.
 */
const got4aws = (awsOptions: GotAWSOptions = {}) => {
	let credentialProviders: AWS.Credentials[] | undefined;

	if (awsOptions.providers) {
		credentialProviders = Array.isArray(awsOptions.providers) ? awsOptions.providers : [awsOptions.providers];
	}

	// Setup the credential provider chain to retrieve the signature credentials
	const chain = new AWS.CredentialProviderChain(credentialProviders as any);

	return got.extend({
		responseType: 'json',
		hooks: {
			beforeRequest: [
				async options => {
					if ((options as any).isStream) {
						// Don't touch streams
						return;
					}

					// Make sure the credentials are resolved
					const credentials = await chain.resolvePromise();

					const {url, headers} = options;

					// Extract the Amazon trace id from the headers as it shouldn't be used for signing
					const {[XRAY_TRACE_HEADER]: amazonTraceId, ...signingHeaders} = headers;

					// Map the request to something that is signable by aws4
					const request = {
						protocol: url.protocol,
						host: url.host,
						path: url.pathname + (url.search || ''),
						headers: signingHeaders,
						body: options.json ? JSON.stringify(options.json) : options.body,
						service: awsOptions.service,
						region: awsOptions.region
					};

					aws4.sign(request, credentials);

					options.headers = {
						...request.headers,
						// Put back the trace id if we have one
						...(amazonTraceId ? {[XRAY_TRACE_HEADER]: amazonTraceId} : {})
					};
				}
			]
		}
	});
};

export default got4aws;

// For CommonJS default export support
module.exports = got4aws;
module.exports.default = got4aws;
