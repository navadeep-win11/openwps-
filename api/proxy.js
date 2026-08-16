export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { method, endpoint, apiKey, payload } = req.body;

  if (!endpoint || !apiKey) {
    return res.status(400).json({ error: 'Missing endpoint or API key' });
  }

  try {
    const options = {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };

    if (method === 'POST' && payload) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(endpoint, options);
    const contentType = response.headers.get('content-type');

    // If it's an image from Hugging Face, convert binary to base64
    if (contentType && contentType.startsWith('image/')) {
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return res.status(response.status).json({
        data: [{ b64_json: base64 }]
      });
    }

    // Normal JSON response (NVIDIA, OpenAI, etc)
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { error: { message: `Non-JSON response: ${text.substring(0, 100)}` } };
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    const errorDetails = error.cause ? ` (${error.cause.message || error.cause})` : '';
    res.status(500).json({ 
       error: { message: `Proxy Error: ${error.message}${errorDetails}` } 
    });
  }
}
