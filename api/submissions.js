const BUCKET_ID = 'VBAzUrrFBz3Rddx7tghqo9';
const KVDB_BASE = `https://kvdb.io/${BUCKET_ID}`;
const INDEX_KEY = 'pondy_surveys_index';
const CHUNK_SIZE = 250; // Keep each JSON payload < 200KB for maximum stability

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

  try {
    if (req.method === 'GET') {
      // 1. Check if chunked index exists
      const indexRes = await fetch(`${KVDB_BASE}/${INDEX_KEY}?nocache=${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
      
      if (indexRes.ok) {
        const indexData = await indexRes.json();
        if (indexData.chunks && Array.isArray(indexData.chunks) && indexData.chunks.length > 0) {
          // Fetch all chunks in parallel
          const chunkPromises = indexData.chunks.map(chunkKey => 
            fetch(`${KVDB_BASE}/${chunkKey}?nocache=${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
              .then(r => r.ok ? r.json() : [])
              .catch(() => [])
          );
          const chunkResults = await Promise.all(chunkPromises);
          const allSurveys = chunkResults.flat();
          res.status(200).json(allSurveys);
          return;
        }
      }

      // Fallback: Legacy single-key retrieval
      const legacyRes = await fetch(`${KVDB_BASE}/pondy_surveys_v2?nocache=${Date.now()}`);
      if (legacyRes.status === 404) {
        res.status(200).json([]);
        return;
      }
      if (!legacyRes.ok) {
        throw new Error(`KVdb Read Error: ${await legacyRes.text()}`);
      }
      const legacySurveys = await legacyRes.json();
      res.status(200).json(legacySurveys);

    } else if (req.method === 'POST') {
      const newSurvey = req.body;
      if (!newSurvey || typeof newSurvey !== 'object') {
        res.status(400).json({ error: "Invalid survey data" });
        return;
      }

      newSurvey.clientIp = clientIp.split(',')[0].trim();
      newSurvey.serverReceivedTimestamp = new Date().toISOString();

      if (newSurvey.startTimestamp && newSurvey.endTimestamp) {
        const start = new Date(newSurvey.startTimestamp).getTime();
        const end = new Date(newSurvey.endTimestamp).getTime();
        const seconds = Math.max(1, Math.round((end - start) / 1000));
        newSurvey.durationSeconds = seconds;
        newSurvey.isSuspicious = seconds < 60;
      } else {
        newSurvey.durationSeconds = 0;
        newSurvey.isSuspicious = true;
      }

      // Check chunked index
      const indexRes = await fetch(`${KVDB_BASE}/${INDEX_KEY}?nocache=${Date.now()}`);
      let indexData = null;
      if (indexRes.ok) {
        indexData = await indexRes.json();
      }

      if (indexData && indexData.chunks && indexData.chunks.length > 0) {
        // Prepend to newest chunk
        const headChunkKey = indexData.chunks[0];
        const headRes = await fetch(`${KVDB_BASE}/${headChunkKey}?nocache=${Date.now()}`);
        let headList = headRes.ok ? await headRes.json() : [];

        if (headList.length >= CHUNK_SIZE) {
          // Chunk is full -> create new chunk
          const newChunkKey = `pondy_surveys_c${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          indexData.chunks.unshift(newChunkKey);
          headList = [newSurvey];

          await Promise.all([
            fetch(`${KVDB_BASE}/${newChunkKey}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(headList)
            }),
            fetch(`${KVDB_BASE}/${INDEX_KEY}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(indexData)
            })
          ]);
        } else {
          headList.unshift(newSurvey);
          indexData.totalRecords = (indexData.chunks.length - 1) * CHUNK_SIZE + headList.length;
          indexData.updatedAt = new Date().toISOString();
          await Promise.all([
            fetch(`${KVDB_BASE}/${headChunkKey}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(headList)
            }),
            fetch(`${KVDB_BASE}/${INDEX_KEY}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(indexData)
            })
          ]);
        }
      } else {
        // Fallback single key
        const readUrl = `${KVDB_BASE}/pondy_surveys_v2?nocache=${Date.now()}`;
        const getRes = await fetch(readUrl);
        let currentList = getRes.ok ? await getRes.json() : [];
        currentList.unshift(newSurvey);

        const putRes = await fetch(`${KVDB_BASE}/pondy_surveys_v2`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentList)
        });

        if (!putRes.ok) {
          throw new Error(`KVdb Write Error: ${await putRes.text()}`);
        }
      }

      res.status(200).json({ status: "success", surveyId: newSurvey.id, duration: newSurvey.durationSeconds });

    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error("Survey Submissions API Error:", err);
    res.status(500).json({ error: err.message });
  }
}
