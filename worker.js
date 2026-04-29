/**
 * Sillycone Metadata Worker
 * Fetches og:title and og:image from any URL, returns JSON.
 *
 * Deploy steps:
 *  1. Go to https://workers.cloudflare.com and create a free account
 *  2. Create a new Worker, paste this file in
 *  3. Deploy — you'll get a URL like https://sillycone-meta.yourname.workers.dev
 *  4. Paste that URL into WORKER_URL in the-shelf.html
 */

export default {
  async fetch(request) {

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return json({ error: 'Missing url parameter' }, 400);
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Sillycone/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        cf: { cacheTtl: 3600 },
      });

      if (!response.ok) {
        return json({ error: `Upstream returned ${response.status}` }, 502);
      }

      const html = await response.text();

      const title =
        getMeta(html, 'og:title') ||
        getMeta(html, 'twitter:title') ||
        html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
        null;

      const image =
        getMeta(html, 'og:image') ||
        getMeta(html, 'twitter:image') ||
        null;

      return json({ title, image });

    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};

function getMeta(html, property) {
  return (
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'))?.[1] ||
    null
  );
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
