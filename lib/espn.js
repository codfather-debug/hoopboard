// ESPN public API helpers - no key required

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball'

export async function getNBAScoreboard() {
  const res = await fetch(`${ESPN_BASE}/nba/scoreboard`, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = await res.json()
  return data.events || []
}

export async function getNCAA_MBScoreboard() {
  const res = await fetch(`${ESPN_BASE}/mens-college-basketball/scoreboard`, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = await res.json()
  return data.events || []
}

export async function getGameSummary(league, gameId) {
  const leaguePath = league === 'nba' ? 'nba' : 'mens-college-basketball'
  const res = await fetch(`${ESPN_BASE}/${leaguePath}/summary?event=${gameId}`, { next: { revalidate: 30 } })
  if (!res.ok) return null
  return res.json()
}

// Parse a competition object from ESPN scoreboard
export function parseGame(event, league) {
  const comp = event.competitions?.[0]
  if (!comp) return null

  const home = comp.competitors?.find(c => c.homeAway === 'home')
  const away = comp.competitors?.find(c => c.homeAway === 'away')

  const broadcasts = comp.broadcasts || []
  const networks = broadcasts.flatMap(b => b.names || [])

  const status = event.status?.type
  const isLive = status?.state === 'in'
  const isFinal = status?.state === 'post'
  const period = event.status?.period || status?.period || 0
  const clock = event.status?.displayClock || status?.displayClock || ''
  const statusText = status?.shortDetail || status?.description || ''

  return {
    id: event.id,
    league,
    name: event.shortName || event.name,
    isLive,
    isFinal,
    isScheduled: status?.state === 'pre',
    period,
    clock,
    statusText,
    date: event.date,
    home: {
      id: home?.id,
      name: home?.team?.shortDisplayName || home?.team?.displayName || '',
      abbr: home?.team?.abbreviation || '',
      logo: home?.team?.logo || '',
      score: home?.score ?? null,
      record: home?.records?.[0]?.summary || '',
      rank: home?.curatedRank?.current || null,
    },
    away: {
      id: away?.id,
      name: away?.team?.shortDisplayName || away?.team?.displayName || '',
      abbr: away?.team?.abbreviation || '',
      logo: away?.team?.logo || '',
      score: away?.score ?? null,
      record: away?.records?.[0]?.summary || '',
      rank: away?.curatedRank?.current || null,
    },
    networks: networks.length > 0 ? networks : ['—'],
    venue: comp.venue?.fullName || '',
    odds: comp.odds?.[0]?.details || null,
  }
}

// Parse top players from summary
export function parseLeaders(summary) {
  if (!summary) return []
  const leaders = summary.leaders || []
  const result = []

  for (const group of leaders) {
    for (const cat of group.leaders || []) {
      for (const leader of cat.leaders || []) {
        result.push({
          name: leader.athlete?.displayName || '',
          team: leader.athlete?.team?.abbreviation || '',
          statName: cat.name,
          statValue: cat.displayValue || leader.displayValue || '',
          headshot: leader.athlete?.headshot?.href || null,
        })
      }
    }
  }
  return result.slice(0, 6)
}
