// In-memory storage for the PDF counter
let pdfCount = 0;

export default function handler(req, res) {
  // Set CORS headers to allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Return current PDF count
    res.status(200).json({ 
      count: pdfCount,
      timestamp: new Date().toISOString()
    });
  } else if (req.method === 'POST') {
    // Increment PDF count
    pdfCount += 1;
    console.log(`PDF counter incremented to: ${pdfCount}`);
    res.status(200).json({ 
      count: pdfCount,
      timestamp: new Date().toISOString()
    });
  } else {
    // Method not allowed
    res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST']
    });
  }
}
