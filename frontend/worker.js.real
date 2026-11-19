export default {
  fetch: (request, env) => {
    const url = new URL(request.url);
    if (url.pathname === '/__ping') {
      return new Response(JSON.stringify({ worker_reached: true, host: url.hostname, path: url.pathname }), {
        headers: { 'content-type': 'application/json', 'x-worker-reached': 'yes' }
      });
    }
    return env.ASSETS.fetch(request);
  }
};
