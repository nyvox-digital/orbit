export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  // Only allow fetching from known image sources
  const allowed = [
    'oaidalleapiprodscus.blob.core.windows.net',
    'oaidalle',
    'openai.com',
  ];
  try {
    const parsed = new URL(url);
    const isAllowed = allowed.some(h => parsed.hostname.includes(h));
    if (!isAllowed) return res.status(403).json({ error: 'Host not allowed' });
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'KREIO-Proxy/1.0' },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error' });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
