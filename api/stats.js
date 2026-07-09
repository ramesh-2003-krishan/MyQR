import { createClient } from 'redis';

let redisClient;

async function getClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL
    });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
}

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
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      // Option A: Use HTTP REST endpoint
      const resMget = await fetch(`${redisUrl}/mget/scan_points_2/scan_points_5/scan_points_10/scan_total`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      
      if (!resMget.ok) {
        throw new Error(`Redis REST request failed: ${resMget.statusText}`);
      }

      const data = await resMget.json();
      const [scans2, scans5, scans10, total] = data.result || [0, 0, 0, 0];

      return res.status(200).json({
        scan_2: parseInt(scans2 || 0, 10),
        scan_5: parseInt(scans5 || 0, 10),
        scan_10: parseInt(scans10 || 0, 10),
        total: parseInt(total || 0, 10)
      });
    } else if (process.env.REDIS_URL) {
      // Option B: TCP Client fallback
      const client = await getClient();
      const [scans2, scans5, scans10, total] = await client.mGet([
        'scan_points_2',
        'scan_points_5',
        'scan_points_10',
        'scan_total'
      ]);

      return res.status(200).json({
        scan_2: parseInt(scans2 || 0, 10),
        scan_5: parseInt(scans5 || 0, 10),
        scan_10: parseInt(scans10 || 0, 10),
        total: parseInt(total || 0, 10)
      });
    } else {
      return res.status(500).json({
        error: 'Vercel KV or REDIS_URL environment variables are not configured in Vercel Storage integration.'
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
