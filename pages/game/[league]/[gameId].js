import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { parseGame, getNBAScoreboard, getNCAA_MBScoreboard } from '../../../lib/espn'

export default function GamePage({ game, summary, league }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!game) {
    return (
      <div style={{ padding: 40, color: 'var(--muted)', textAlign: 'center', fontFamily: '"IBM Plex Mono", monospace' }}>
        GAME NOT FOUND
      </div>
    )
  }

  const hasScore = game.home.score !== null && game.away.score !== null
  const homeWins = hasScore && Number(game.home.score) > Number(game.away.score)
  const awayWins = hasScore && Number(game.away.score) > Number(game.home.score)

  // Parse player stats from summary
  const boxscore = summary?.boxscore
  const playerStats = boxscore?.players || []
  const leaders = summary?.leaders || []

  return (
    <>
      <Head>
        <title>{game.away.abbr} @ {game.home.abbr} — HoopBoard</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Nav */}
        <header style={{
          borderBottom: '1px solid var(--border)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <Link href="/" style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            color: 'var(--muted)',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            ← HOOPBOARD
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            color: league === 'nba' ? 'var(--nba)' : 'var(--ncaa)',
            letterSpacing: '2px',
          }}>
            {league === 'nba' ? 'NBA' : 'NCAAM'}
          </span>
        </header>

        <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 16px' }}>
          {/* Scoreboard Hero */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '32px 24px',
            marginBottom: 32,
          }}>
            {/* Status */}
            <div style={{
              textAlign: 'center',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11,
              color: game.isLive ? 'var(--live)' : 'var(--muted)',
              letterSpacing: '2px',
              marginBottom: 24,
            }}>
              {game.isLive ? `LIVE · Q${game.period} ${game.clock}` : game.statusText}
            </div>

            {/* Teams */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: 24,
            }}>
              {/* Away */}
              <TeamHero team={game.away} wins={awayWins} hasScore={hasScore} align="right" />

              {/* Score / VS */}
              <div style={{ textAlign: 'center' }}>
                {hasScore ? (
                  <div style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 40,
                    fontWeight: 600,
                    color: 'var(--text)',
                    letterSpacing: '-2px',
                  }}>
                    <span style={{ color: awayWins ? 'var(--accent)' : '#666' }}>{game.away.score}</span>
                    <span style={{ color: 'var(--border)', margin: '0 8px' }}>–</span>
                    <span style={{ color: homeWins ? 'var(--accent)' : '#666' }}>{game.home.score}</span>
                  </div>
                ) : (
                  <div style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 14,
                    color: 'var(--muted)',
                  }}>
                    {mounted ? new Date(game.date).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
                    }) : ''}
                  </div>
                )}
              </div>

              {/* Home */}
              <TeamHero team={game.home} wins={homeWins} hasScore={hasScore} align="left" />
            </div>
          </div>

          {/* Broadcast & Venue */}
          <InfoRow label="BROADCAST" value={game.networks.join(' · ')} />
          {game.venue && <InfoRow label="VENUE" value={game.venue} />}
          {game.odds && <InfoRow label="SPREAD" value={game.odds} />}

          {/* Stat Leaders */}
          {leaders.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <SectionHead text="STAT LEADERS" />
              <LeadersTable leaders={leaders} />
            </div>
          )}

          {/* Box Score */}
          {playerStats.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <SectionHead text="BOX SCORE" />
              {playerStats.map((teamStats, ti) => (
                <PlayerTable key={ti} teamStats={teamStats} />
              ))}
            </div>
          )}

          {playerStats.length === 0 && !game.isScheduled && (
            <div style={{
              marginTop: 40,
              padding: '40px 0',
              textAlign: 'center',
              color: 'var(--muted)',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 12,
              border: '1px solid var(--border)',
              borderRadius: 4,
            }}>
              STATS NOT AVAILABLE YET
            </div>
          )}

          {game.isScheduled && (
            <div style={{
              marginTop: 40,
              padding: '40px 0',
              textAlign: 'center',
              color: 'var(--muted)',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 12,
              border: '1px solid var(--border)',
              borderRadius: 4,
            }}>
              GAME HAS NOT STARTED · CHECK BACK SOON
            </div>
          )}
        </main>
      </div>
    </>
  )
}

function TeamHero({ team, wins, hasScore, align }) {
  return (
    <div style={{ textAlign: align, display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap: 8 }}>
      {team.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt={team.abbr} width={52} height={52} style={{ objectFit: 'contain' }} />
      )}
      {team.rank && (
        <span style={{
          fontSize: 10,
          fontFamily: '"IBM Plex Mono", monospace',
          color: 'var(--muted)',
        }}>#{team.rank}</span>
      )}
      <div style={{
        fontSize: 22,
        fontWeight: wins ? 600 : 400,
        color: wins ? 'var(--text)' : '#888',
      }}>
        {team.name}
      </div>
      {team.record && (
        <div style={{
          fontSize: 11,
          fontFamily: '"IBM Plex Mono", monospace',
          color: 'var(--muted)',
        }}>{team.record}</div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid var(--border)',
      padding: '12px 0',
      gap: 24,
    }}>
      <span style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 10,
        color: 'var(--muted)',
        letterSpacing: '1px',
        minWidth: 90,
        flexShrink: 0,
        paddingTop: 1,
      }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

function SectionHead({ text }) {
  return (
    <div style={{
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: 10,
      color: 'var(--muted)',
      letterSpacing: '2px',
      marginBottom: 12,
      borderLeft: '2px solid var(--accent)',
      paddingLeft: 10,
    }}>
      {text}
    </div>
  )
}

function LeadersTable({ leaders }) {
  const allLeaders = []

  for (const cat of leaders) {
    const catName = cat.name
    for (const leader of (cat.leaders || [])) {
      allLeaders.push({
        name: leader.athlete?.displayName || '',
        team: leader.athlete?.team?.abbreviation || '',
        stat: catName,
        value: leader.displayValue || '',
        headshot: leader.athlete?.headshot?.href || null,
      })
    }
  }

  if (allLeaders.length === 0) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 8,
    }}>
      {allLeaders.map((l, i) => (
        <div key={i} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {l.headshot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.headshot} alt={l.name} width={36} height={36} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{l.name}</div>
            <div style={{
              fontSize: 10,
              fontFamily: '"IBM Plex Mono", monospace',
              color: 'var(--muted)',
            }}>{l.team}</div>
            <div style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11,
              color: 'var(--accent)',
              marginTop: 2,
            }}>
              {l.value} {l.stat.toUpperCase()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PlayerTable({ teamStats }) {
  const teamName = teamStats.team?.displayName || teamStats.team?.abbreviation || ''
  const stats = teamStats.statistics || []
  const colNames = stats[0]?.names || []
  const athletes = teamStats.athletes || []

  // Simplified: only show key columns
  const wantedCols = ['MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'FG%']
  const colIndices = wantedCols.map(c => colNames.indexOf(c)).filter(i => i !== -1)
  const colLabels = colIndices.map(i => colNames[i])

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 11,
        color: 'var(--text)',
        marginBottom: 8,
        letterSpacing: '1px',
      }}>
        {teamName.toUpperCase()}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)', letterSpacing: '1px', fontWeight: 500, whiteSpace: 'nowrap' }}>PLAYER</th>
              {colLabels.map(c => (
                <th key={c} style={{ textAlign: 'right', padding: '6px 8px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)', letterSpacing: '1px', fontWeight: 500 }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.filter(a => !a.didNotPlay).map((a, i) => {
              const rowStats = a.stats || []
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 500 }}>{a.athlete?.shortName || a.athlete?.displayName || ''}</span>
                    {a.starter && (
                      <span style={{ marginLeft: 6, fontSize: 9, fontFamily: '"IBM Plex Mono", monospace', color: 'var(--muted)' }}>STARTER</span>
                    )}
                  </td>
                  {colIndices.map((ci, j) => (
                    <td key={j} style={{
                      textAlign: 'right',
                      padding: '8px 8px',
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 12,
                      color: colLabels[j] === 'PTS' && Number(rowStats[ci]) >= 20 ? 'var(--accent)' : 'var(--text)',
                      fontWeight: colLabels[j] === 'PTS' && Number(rowStats[ci]) >= 20 ? 600 : 400,
                    }}>
                      {rowStats[ci] ?? '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export async function getServerSideProps({ params }) {
  const { league, gameId } = params

  try {
    // Fetch the game from the scoreboard to get base info
    const [nbaRaw, ncaaRaw] = await Promise.all([
      getNBAScoreboard(),
      getNCAA_MBScoreboard(),
    ])

    const allRaw = league === 'nba' ? nbaRaw : ncaaRaw
    const eventRaw = allRaw.find(e => e.id === gameId)
    const game = eventRaw ? parseGame(eventRaw, league) : null

    // Fetch game summary for detailed stats
    const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball'
    const leaguePath = league === 'nba' ? 'nba' : 'mens-college-basketball'
    let summary = null

    try {
      const res = await fetch(`${ESPN_BASE}/${leaguePath}/summary?event=${gameId}`)
      if (res.ok) summary = await res.json()
    } catch (e) {
      // summary not available
    }

    return {
      props: {
        game,
        summary,
        league,
      }
    }
  } catch (err) {
    console.error(err)
    return { props: { game: null, summary: null, league } }
  }
}
