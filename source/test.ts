import test from 'ava';
import * as nock from 'nock';
import * as sinon from 'sinon';
import {Response} from 'got';
import got4aws from '.';

process.env.AWS_ACCESS_KEY_ID = 'unicorn';
process.env.AWS_SECRET_ACCESS_KEY = 'rainbow';

const extractHeaders = (response: Response) => ({
	'X-Amz-Date': response.request.options.headers['X-Amz-Date'],
	Authorization: response.request.options.headers.Authorization
});

let clock: sinon.SinonFakeTimers;

test.before(() => {
	clock = sinon.useFakeTimers(new Date('2020-07-01T10:00:00Z'));

	nock('http://www.example.com')
		.get('/resource')
		.reply(200, '{"unicorn":"🦄"}')
		.get('/resource?unicorn=rainbow')
		.reply(200, '{"unicorn":"rainbow"}')
		.persist();

	nock('https://rainbow.execute-api.eu-west-1.amazonaws.com')
		.get('/v0')
		.reply(200, '{"rainbow":"🌈"}')
		.persist();
});

test.after(() => {
	clock.restore();
});

test('parse response as `json` by default', async t => {
	const got = got4aws();

	const result = await got('http://www.example.com/resource');

	t.deepEqual(result.body as unknown, {
		unicorn: '🦄'
	});
});

test('override `responseType`', async t => {
	const got = got4aws();

	const result = await got('http://www.example.com/resource', {
		responseType: 'text'
	});

	t.is(result.body, '{"unicorn":"🦄"}');
});

test('provide service option', async t => {
	const got = got4aws({
		service: 'execute-api'
	});

	const result = await got('http://www.example.com/resource');

	t.deepEqual(extractHeaders(result), {
		'X-Amz-Date': '20200701T100000Z',
		Authorization: 'AWS4-HMAC-SHA256 Credential=unicorn/20200701/us-east-1/execute-api/aws4_request, SignedHeaders=accept;accept-encoding;host;x-amz-date, Signature=836d8e29b1cf3cbe6f8401dd9cf9703adc5b95d9c96be2e5646d878dddb856b3'
	});

	t.deepEqual(result.body as unknown, {
		unicorn: '🦄'
	});
});

test('use querystring', async t => {
	const got = got4aws({
		service: 'execute-api'
	});

	const result = await got('http://www.example.com/resource?unicorn=rainbow');

	t.deepEqual(extractHeaders(result), {
		'X-Amz-Date': '20200701T100000Z',
		Authorization: 'AWS4-HMAC-SHA256 Credential=unicorn/20200701/us-east-1/execute-api/aws4_request, SignedHeaders=accept;accept-encoding;host;x-amz-date, Signature=a7367f1443e9ba4cc100382f053ffda70a6f880f010e742aa35a033cf6cf20d4'
	});

	t.deepEqual(result.body as unknown, {
		unicorn: 'rainbow'
	});
});

test('provide region option', async t => {
	const got = got4aws({
		service: 'execute-api',
		region: 'eu-west-1'
	});

	const result = await got('http://www.example.com/resource');

	t.deepEqual(extractHeaders(result), {
		'X-Amz-Date': '20200701T100000Z',
		Authorization: 'AWS4-HMAC-SHA256 Credential=unicorn/20200701/eu-west-1/execute-api/aws4_request, SignedHeaders=accept;accept-encoding;host;x-amz-date, Signature=c37cc081b7ba9cfcc703a2402a92f321409f69279c590451e3c5316619354dee'
	});

	t.deepEqual(result.body as unknown, {
		unicorn: '🦄'
	});
});

test('infer service and region', async t => {
	const got = got4aws();

	const result = await got('https://rainbow.execute-api.eu-west-1.amazonaws.com/v0');

	t.deepEqual(extractHeaders(result), {
		'X-Amz-Date': '20200701T100000Z',
		Authorization: 'AWS4-HMAC-SHA256 Credential=unicorn/20200701/eu-west-1/execute-api/aws4_request, SignedHeaders=accept;accept-encoding;host;x-amz-date, Signature=73fdc63b723db15c5248d0105f7614ada5e2150d9587f1013121d0022b85f497'
	});

	t.deepEqual(result.body as unknown, {
		rainbow: '🌈'
	});
});
