import { getNBAScoreboard, getNCAA_MBScoreboard, parseGame } from '../../lib/espn'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball'

export default async function handler(req, res) {
  const { league, gameId } = req.query
  if (!league || !gameId) return res.status(400).json({ error: 'Missing params' })

  try {
    const [nbaRaw, ncaaRaw] = await Promise.all([
      getNBAScoreboard(),
      getNCAA_MBScoreboard(),
    ])

    const allRaw = league === 'nba' ? nbaRaw : ncaaRaw
    const eventRaw = allRaw.find(e => e.id === gameId)
    const game = eventRaw ? parseGame(eventRaw, league) : null

    // Linescores come directly from the scoreboard event competitors
    const linescores = eventRaw?.competitions?.[0]?.competitors || []

    const leaguePath = league === 'nba' ? 'nba' : 'mens-college-basketball'
    let plays = [], leaders = [], playerStats = []

    try {
      const summaryRes = await fetch(`${ESPN_BASE}/${leaguePath}/summary?event=${gameId}`)
      if (summaryRes.ok) {
        const summary = await summaryRes.json()
        plays = summary.plays || []
        leaders = summary.leaders || []
        playerStats = summary.boxscore?.players || []
      }
    } catch (e) { /* silent */ }

    res.setHeader('Cache-Control', 's-maxage=25, stale-while-revalidate')
    return res.json({ game, plays, leaders, playerStats, linescores })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch game data' })
  }
}
