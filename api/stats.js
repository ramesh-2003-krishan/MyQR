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

  try {
    const redisUrl = process.env.KV_REST_API_URL;
    const redisToken = process.env.KV_REST_API_TOKEN;

    if (!redisUrl || !redisToken) {
      return res.status(500).json({
        error: 'Vercel KV is not configured. Please create a KV database in the Storage tab on Vercel and connect it to this project.'
      });
    }

    // Load metrics from Vercel KV via MGET
    const resMget = await fetch(`${redisUrl}/mget/scan_points_2/scan_points_5/scan_points_10/scan_total`, {
      headers: { Authorization: `Bearer ${redisToken}` }
    });
    
    if (!resMget.ok) {
      throw new Error(`Redis request failed: ${resMget.statusText}`);
    }

    const data = await resMget.json();
    const [scans2, scans5, scans10, total] = data.result || [0, 0, 0, 0];

    return res.status(200).json({
      scan_2: parseInt(scans2 || 0, 10),
      scan_5: parseInt(scans5 || 0, 10),
      scan_10: parseInt(scans10 || 0, 10),
      total: parseInt(total || 0, 10)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
