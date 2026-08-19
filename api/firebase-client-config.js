function publicFirebaseConfig() {
  const projectId = process.env.FIREBASE_WEB_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.FIREBASE_API_KEY;
  const authDomain = process.env.FIREBASE_WEB_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : '');

  return {
    apiKey,
    authDomain,
    projectId,
    appId: process.env.FIREBASE_WEB_APP_ID || process.env.FIREBASE_APP_ID,
    messagingSenderId: process.env.FIREBASE_WEB_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    storageBucket: process.env.FIREBASE_WEB_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const config = publicFirebaseConfig();
  if (!config.apiKey || !config.authDomain || !config.projectId) {
    return res.status(500).json({
      error: 'Missing Firebase web environment variables.',
      required: ['FIREBASE_WEB_API_KEY', 'FIREBASE_WEB_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID'],
    });
  }

  Object.keys(config).forEach((key) => {
    if (!config[key]) delete config[key];
  });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(config);
};
