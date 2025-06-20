import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// adapter-node runs your app as a Node server
		// See https://svelte.dev/docs/kit/adapter-node for more information about this adapter.
		adapter: adapter()
	}
};

export default config;
