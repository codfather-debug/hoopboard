import { getNBAScoreboard, getNCAA_MBScoreboard, parseGame } from '../../lib/espn'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball'

export default async function handler(req, res) {
  const { league, gameId } = req.query

  if (!league || !gameId) {
    return res.status(400).json({ error: 'Missing league or gameId' })
  }

  try {
    const [raw, summaryRes] = await Promise.all([
      league === 'nba' ? getNBAScoreboard() : getNCAA_MBScoreboard(),
      fetch(`${ESPN_BASE}/${league === 'nba' ? 'nba' : 'mens-college-basketball'}/summary?event=${gameId}`),
    ])

    const eventRaw = raw.find(e => e.id === gameId)
    const game = eventRaw ? parseGame(eventRaw, league) : null

    let plays = []
    let leaders = []
    let playerStats = []

    if (summaryRes.ok) {
      const summary = await summaryRes.json()
      plays = summary.plays || []
      leaders = summary.leaders || []
      playerStats = summary.boxscore?.players || []
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ game, plays, leaders, playerStats })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch game data' })
  }
}
