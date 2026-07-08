export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { points } = req.query;
  const pStr = points ? points.toString().trim() : '';

  if (!pStr || !['2', '5', '10'].includes(pStr)) {
    return res.status(400).json({ error: 'Invalid points parameter' });
  }

  try {
    const redisUrl = process.env.KV_REST_API_URL;
    const redisToken = process.env.KV_REST_API_TOKEN;

    if (!redisUrl || !redisToken) {
      return res.status(500).json({
        error: 'Vercel KV is not configured. Please create a KV database in the Storage tab on Vercel and connect it to this project.'
      });
    }

    // Increment points count and total count in parallel using Upstash REST API
    await Promise.all([
      fetch(`${redisUrl}/incr/scan_points_${pStr}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      }),
      fetch(`${redisUrl}/incr/scan_total`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      })
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
