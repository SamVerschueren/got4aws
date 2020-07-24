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
		Authorization: 'AWS4-HMAC-SHA256 Credential=unicorn/20200701/us-east-1/execute-api/aws4_request, SignedHeaders=accept;accept-encoding;host;user-agent;x-amz-date, Signature=b6c4ab33c3992fca1f90e5003be094a468eb71655f3891c98aec815b60ceaa23'
	});

	t.deepEqual(result.body as unknown, {
		unicorn: '🦄'
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
		Authorization: 'AWS4-HMAC-SHA256 Credential=unicorn/20200701/eu-west-1/execute-api/aws4_request, SignedHeaders=accept;accept-encoding;host;user-agent;x-amz-date, Signature=2f30e9cec0e1429031f846074642b0f247b61c36e51159385057bbfb18e10fc4'
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
		Authorization: 'AWS4-HMAC-SHA256 Credential=unicorn/20200701/eu-west-1/execute-api/aws4_request, SignedHeaders=accept;accept-encoding;host;user-agent;x-amz-date, Signature=f41b94660fa4d74b99058b4e6754cb28e33c2c1cf6ddfea4cc96826cd5d65a63'
	});

	t.deepEqual(result.body as unknown, {
		rainbow: '🌈'
	});
});
