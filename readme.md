# aws4got [![Build Status](https://travis-ci.org/samverschueren/got4aws.svg?branch=master)](https://travis-ci.org/samverschueren/got4aws)

> Convenience wrapper for [Got](https://github.com/sindresorhus/got) to interact with [AWS v4 signed](https://docs.aws.amazon.com/general/latest/gr/signing_aws_api_requests.html) APIs

## Install

```
$ npm install got4aws
```

## Usage

Instead of:

```ts
import got from 'got';
import * as aws4 from 'aws4';
import * as url from 'url';

(async () => {
	const {protocol, host, path} = url.parse('https://12abc34.execute-api.us-east-1.amazonaws.com/v0');

	const request = {
		protocol,
		host,
		path,
		responseType: 'json'
	};

	aws4.sign(request);

	const {body} = await got.get(request);

	console.log(body);
	//=> {status: 'ok'}
})();
```

You can do:

```ts
import got4aws from 'got4aws';

const got = got4aws();

(async () => {
	const {body} = await got.get('https://12abc34.execute-api.us-east-1.amazonaws.com/v0', {
		responseType: 'json'
	});

	console.log(body);
	//=> {status: 'ok'}
})();
```

If you want to load credentials from somewhere else, you can provide extra options to the factory function.

```ts
import got4aws from 'got4aws';

// Load credentials from `~/.aws/credentials`
const got = got4aws({
	providers: new AWS.SharedIniFileCredentials({profile: 'myProfile'})
});

(async () => {
	const {body} = await got.get('https://12abc34.execute-api.us-east-1.amazonaws.com/v0', {
		responseType: 'json'
	});

	console.log(body);
	//=> {status: 'ok'}
})();
```

If you want to invoke an API Gateway endpoint with a custom domain, you will have to set the `service` and `region` as well because they can't be inferred.

```ts
import got4aws from 'got4aws';

const got = got4aws({
	providers: new AWS.SharedIniFileCredentials({profile: 'myProfile'}),
	service: 'execute-api',
	region: 'eu-west-1'
});

(async () => {
	const {body} = await got.get('https://api.unicorn.com/v0', {
		responseType: 'json'
	});

	console.log(body);
	//=> {status: 'ok'}
})();
```


## API

### got4aws(options?)

Returns a [`Got`](https://github.com/sindresorhus/got) instance.

#### options

##### providers

Type: [`Credentials | Credentials[]`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Credentials.html)<br>
Default: [`EnvironmentCredentials`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EnvironmentCredentials.html)

One ore more credential providers that are passed through to the [CredentialsProviderChain](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CredentialProviderChain.html). These providers are used to infer the AWS credentials used for signing the requests.

##### service

Type: `string`<br>
Default: *inferred through URL*

The name of the service to sign the request for. For example, when signing a request for API Gateway with a custom domain, this should be `execute-api`.

##### region

Type: `string`<br>
Default: *inferred through URL*

The region of the service being invoked. If it could not be inferred through the URL, it will default to `us-east-1`.
