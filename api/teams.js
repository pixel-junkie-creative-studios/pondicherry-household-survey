const BUCKET_ID = 'VBAzUrrFBz3Rddx7tghqo9';
const KVDB_TEAMS_URL = `https://kvdb.io/${BUCKET_ID}/pondy_teams_v2`;

// UPDATED 20 INTERVIEWERS ACROSS 4 PONDICHERRY TEAMS
// Team 1 features AKSA SAJU; Team 4 features ROMY ROY
const defaultTeams = [];

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

  const getKvdbUrl = () => `${KVDB_TEAMS_URL}?nocache=${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    if (req.method === 'GET') {
      const readUrl = getKvdbUrl();
      const response = await fetch(readUrl);

      if (response.status === 404) {
        // Seed default 20 interviewers with Aksa Saju & Romy Roy
        await fetch(KVDB_TEAMS_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultTeams)
        });
        res.status(200).json(defaultTeams);
        return;
      }

      const interviewers = await response.json();
      res.status(200).json(interviewers);

    } else if (req.method === 'POST') {
      const newInterviewer = req.body;
      if (!newInterviewer || !newInterviewer.name || !newInterviewer.team) {
        res.status(400).json({ error: "Invalid interviewer profile" });
        return;
      }

      newInterviewer.id = `INT-${Math.floor(100 + Math.random() * 900)}`;
      newInterviewer.location = newInterviewer.location || "Field Area";
      newInterviewer.status = "Active";

      const readUrl = getKvdbUrl();
      const getRes = await fetch(readUrl);
      let list = getRes.ok ? await getRes.json() : [...defaultTeams];

      list.unshift(newInterviewer);

      await fetch(KVDB_TEAMS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list)
      });

      res.status(200).json({ status: "success", interviewer: newInterviewer });

    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error("Teams API Error:", err);
    res.status(500).json({ error: err.message });
  }
}
