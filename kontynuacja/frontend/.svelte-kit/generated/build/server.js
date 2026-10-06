
import error from './shared/error-template.js';

export const options = {
	app_template_contains_nonce: false,
	csp: {"mode":"auto","directives":{"upgrade-insecure-requests":false,"block-all-mixed-content":false},"reportOnly":{"upgrade-insecure-requests":false,"block-all-mixed-content":false}},
	csrf_trusted_origins: [],
	service_worker_options: undefined,
	templates: {
		app: ({ head, body, assets, nonce, env }) => "<!doctype html>\n<html lang=\"pl\" data-theme=\"dark\">\n\t<head>\n\t\t<meta charset=\"utf-8\" />\n\t\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n\t\t<meta name=\"text-scale\" content=\"scale\" />\n\t\t<script>\n\t\t\ttry {\n\t\t\t\tvar saved = JSON.parse(localStorage.getItem('krakow-dostepny:ustawienia') || 'null');\n\t\t\t\tif (saved && saved.theme === 'light') document.documentElement.dataset.theme = 'light';\n\t\t\t\tif (saved && (saved.highContrast || saved.theme === 'contrast'))\n\t\t\t\t\tdocument.documentElement.dataset.contrast = 'high';\n\t\t\t} catch (e) {}\n\t\t</script>\n\t\t" + head + "\n\t</head>\n\t<body data-sveltekit-preload-data=\"hover\">\n\t\t<div style=\"display: contents\">" + body + "</div>\n\t</body>\n</html>\n",
		error
	}
};

export async function get_hooks() {
	let handle;
	let handleFetch;
	let handleError;
	let init;
	

	let reroute;
	let transport;
	

	return {
		handle,
		handleFetch,
		handleError,
		init,
		reroute,
		transport
	};
}
