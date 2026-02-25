import Head from 'next/head'
import Link from 'next/link'
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { parseGame, getNBAScoreboard, getNCAA_MBScoreboard } from '../../../lib/espn'

export default function GamePage({ game: initialGame, summary: initialSummary, league, debugInfo, initialLinescores }) {
  const [mounted, setMounted] = useState(false)
  const [showPlays, setShowPlays] = useState(false)
  const [showMomentum, setShowMomentum] = useState(false)
  const [showCourt, setShowCourt] = useState(false)
  const [showBoxScore, setShowBoxScore] = useState(false)
  const [game, setGame] = useState(initialGame)
  const [plays, setPlays] = useState(initialSummary?.plays || [])
  const [leaders, setLeaders] = useState(initialSummary?.leaders || [])
  const [playerStats, setPlayerStats] = useState(initialSummary?.boxscore?.players || [])
  const [linescores, setLinescores] = useState(initialLinescores || [])
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => setMounted(true), [])

  // Live polling — every 30s for live games
  useEffect(() => {
    if (!initialGame?.isLive) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/game?league=${league}&gameId=${initialGame.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.game) setGame(data.game)
        if (data.plays) setPlays(data.plays)
        if (data.leaders) setLeaders(data.leaders)
        if (data.playerStats) setPlayerStats(data.playerStats)
        if (data.linescores) setLinescores(data.linescores)
        setLastUpdated(new Date())
      } catch (e) { /* silent */ }
    }
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [initialGame?.isLive, initialGame?.id, league])

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
              {game.isLive ? `LIVE · ${game.period > 0 ? `Q${game.period} ${game.clock}` : game.statusText || 'IN PROGRESS'}` : game.statusText}
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

          {/* Quarter Scores */}
          {linescores.length > 0 && hasScore && (
            <div style={{ marginBottom: 32 }}>
              <QuarterScores competitors={linescores} homeAbbr={game.home.abbr} awayAbbr={game.away.abbr} />
            </div>
          )}

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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <SectionHead text="BOX SCORE" />
                <button
                  onClick={() => setShowBoxScore(p => !p)}
                  style={{
                    background: showBoxScore ? 'var(--accent)' : 'transparent',
                    border: '1px solid',
                    borderColor: showBoxScore ? 'var(--accent)' : 'var(--border)',
                    color: showBoxScore ? '#000' : 'var(--muted)',
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10,
                    letterSpacing: '1px',
                    padding: '5px 12px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {showBoxScore ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              {showBoxScore && playerStats.map((teamStats, ti) => (
                <PlayerTable key={ti} teamStats={teamStats} />
              ))}
            </div>
          )}

          {/* Play-by-Play */}
          {plays.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <SectionHead text="PLAY-BY-PLAY" />
                <button
                  onClick={() => setShowPlays(p => !p)}
                  style={{
                    background: showPlays ? 'var(--accent)' : 'transparent',
                    border: '1px solid',
                    borderColor: showPlays ? 'var(--accent)' : 'var(--border)',
                    color: showPlays ? '#000' : 'var(--muted)',
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10,
                    letterSpacing: '1px',
                    padding: '5px 12px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {showPlays ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              {showPlays && <PlayByPlay plays={plays} homeAbbr={game.home.abbr} awayAbbr={game.away.abbr} />}
            </div>
          )}

          {/* Momentum Tracker */}
          {plays.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <SectionHead text="MOMENTUM" />
                <button
                  onClick={() => setShowMomentum(p => !p)}
                  style={{
                    background: showMomentum ? 'var(--accent)' : 'transparent',
                    border: '1px solid',
                    borderColor: showMomentum ? 'var(--accent)' : 'var(--border)',
                    color: showMomentum ? '#000' : 'var(--muted)',
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10,
                    letterSpacing: '1px',
                    padding: '5px 12px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {showMomentum ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              {showMomentum && (
                <MomentumTracker
                  plays={plays}
                  homeName={game.home.name}
                  awayName={game.away.name}
                  homeAbbr={game.home.abbr}
                  awayAbbr={game.away.abbr}
                  homeScore={game.home.score}
                  awayScore={game.away.score}
                />
              )}
            </div>
          )}

          {/* Player Spotlight */}
          {playerStats.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SectionHead text="PLAYER SPOTLIGHT" />
                  {game.isLive && (
                    <span style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 9,
                      color: 'var(--live)',
                      letterSpacing: '1px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--live)',
                        display: 'inline-block',
                      }} />
                      LIVE
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowCourt(p => !p)}
                  style={{
                    background: showCourt ? 'var(--accent)' : 'transparent',
                    border: '1px solid',
                    borderColor: showCourt ? 'var(--accent)' : 'var(--border)',
                    color: showCourt ? '#000' : 'var(--muted)',
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10,
                    letterSpacing: '1px',
                    padding: '5px 12px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {showCourt ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              {showCourt && (
                <PlayerSpotlight
                  playerStats={playerStats}
                  homeAbbr={game.home.abbr}
                  awayAbbr={game.away.abbr}
                  homeLogo={game.home.logo}
                  awayLogo={game.away.logo}
                />
              )}
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

          {/* Temporary debug panel - remove after fixing */}
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

  // ESPN structure: leaders = [{team, leaders: [{displayName, leaders: [{athlete, displayValue}]}]}]
  for (const teamEntry of leaders) {
    const teamAbbr = teamEntry.team?.abbreviation || ''
    for (const cat of (teamEntry.leaders || [])) {
      const catName = cat.displayName || cat.name || ''
      for (const entry of (cat.leaders || [])) {
        const athlete = entry.athlete || {}
        const name = athlete.displayName || ''
        if (!name) continue
        allLeaders.push({
          name,
          team: teamAbbr,
          stat: catName,
          value: entry.displayValue || '',
          headshot: athlete.headshot?.href || null,
        })
      }
    }
  }

  if (allLeaders.length === 0) return (
    <div style={{ padding: '20px 0', color: 'var(--muted)', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>
      NO LEADER DATA AVAILABLE
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
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
            <div style={{ fontSize: 10, fontFamily: '"IBM Plex Mono", monospace', color: 'var(--muted)' }}>{l.team}</div>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
              {l.value} {(l.stat || '').toUpperCase()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


function QuarterScores({ competitors, homeAbbr, awayAbbr }) {
  const home = competitors.find(c => c.homeAway === 'home')
  const away = competitors.find(c => c.homeAway === 'away')
  if (!home || !away) return null

  const homeScores = home.linescores || []
  const awayScores = away.linescores || []
  const numPeriods = Math.max(homeScores.length, awayScores.length)
  if (numPeriods === 0) return null

  const headers = Array.from({ length: numPeriods }, (_, i) =>
    i < 4 ? `Q${i + 1}` : `OT${i - 3}`
  )

  const cellStyle = {
    textAlign: 'right',
    padding: '9px 14px',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 12,
    color: 'var(--text)',
  }
  const headStyle = {
    textAlign: 'right',
    padding: '6px 14px',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 9,
    color: 'var(--muted)',
    letterSpacing: '1px',
    fontWeight: 500,
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ ...headStyle, textAlign: 'left', letterSpacing: '2px', color: 'var(--accent)' }}>QUARTER SCORES</th>
            {headers.map(h => <th key={h} style={headStyle}>{h}</th>)}
            <th style={{ ...headStyle, color: 'var(--text)' }}>TOT</th>
          </tr>
        </thead>
        <tbody>
          {[
            { abbr: awayAbbr, scores: awayScores, total: away.score },
            { abbr: homeAbbr, scores: homeScores, total: home.score },
          ].map(({ abbr, scores, total }) => (
            <tr key={abbr} style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ ...cellStyle, textAlign: 'left', color: 'var(--muted)', letterSpacing: '1px', fontSize: 10 }}>
                {abbr}
              </td>
              {Array.from({ length: numPeriods }, (_, i) => (
                <td key={i} style={cellStyle}>
                  {scores[i]?.value ?? '—'}
                </td>
              ))}
              <td style={{ ...cellStyle, fontWeight: 600, color: 'var(--accent)' }}>
                {total ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlayerTable({ teamStats }) {
  const teamName = teamStats.team?.displayName || teamStats.team?.abbreviation || ''
  const statistics = teamStats.statistics || []

  // ESPN structure: athletes and column names are both inside statistics[0]
  const mainStats = statistics.find(s => s.names && s.names.length > 3) || statistics[0]
  if (!mainStats) return null

  const colNames = mainStats.names || []
  // Athletes live inside the statistics block, not at top level
  const athletes = mainStats.athletes || teamStats.athletes || []
  if (athletes.length === 0) return null

  const wantedCols = ['MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO']
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

function PlayerSpotlight({ playerStats, homeAbbr, awayAbbr, homeLogo, awayLogo }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [barProgress, setBarProgress] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const rafRef = useRef(null)
  const autoRef = useRef(null)

  // Collect all players from both teams, sorted by points
  const allPlayers = useMemo(() => {
    const result = []
    for (const teamData of playerStats) {
      const teamAbbr = teamData.team?.abbreviation || ''
      const isHome = teamAbbr === homeAbbr
      const statistics = teamData.statistics || []
      const mainStats = statistics.find(s => s.names && s.names.length > 3) || statistics[0]
      if (!mainStats) continue
      const names = mainStats.names || []
      const athletes = mainStats.athletes || teamData.athletes || []
      const ptsIdx = names.indexOf('PTS')
      const rebIdx = names.indexOf('REB')
      const astIdx = names.indexOf('AST')
      const stlIdx = names.indexOf('STL')
      const blkIdx = names.indexOf('BLK')
      const minIdx = names.indexOf('MIN')
      const fgIdx = names.indexOf('FG')

      for (const a of athletes) {
        if (a.didNotPlay) continue
        const stats = a.stats || []
        const pts = Number(stats[ptsIdx] ?? 0)
        if (pts === 0 && Number(stats[minIdx] ?? 0) === 0) continue
        result.push({
          name: a.athlete?.displayName || '',
          shortName: a.athlete?.shortName || a.athlete?.displayName || '',
          headshot: a.athlete?.headshot?.href || null,
          teamAbbr,
          isHome,
          starter: a.starter || false,
          pts,
          reb: Number(stats[rebIdx] ?? 0),
          ast: Number(stats[astIdx] ?? 0),
          stl: Number(stats[stlIdx] ?? 0),
          blk: Number(stats[blkIdx] ?? 0),
          min: String(stats[minIdx] ?? '0'),
          fg: String(stats[fgIdx] ?? ''),
        })
      }
    }
    return result.sort((a, b) => b.pts - a.pts).slice(0, 12)
  }, [playerStats, homeAbbr])

  // Animate bars when player changes
  const animateBars = useCallback(() => {
    setBarProgress(0)
    setAnimating(true)
    const start = performance.now()
    const duration = 700
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3) // ease out cubic
      setBarProgress(ease)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else setAnimating(false)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    animateBars()
    return () => cancelAnimationFrame(rafRef.current)
  }, [activeIdx, animateBars])

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate || allPlayers.length === 0) return
    autoRef.current = setInterval(() => {
      setActiveIdx(i => (i + 1) % allPlayers.length)
    }, 3500)
    return () => clearInterval(autoRef.current)
  }, [autoRotate, allPlayers.length])

  if (allPlayers.length === 0) return (
    <div style={{ padding: 24, color: 'var(--muted)', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>
      NO PLAYER DATA AVAILABLE
    </div>
  )

  const player = allPlayers[activeIdx]
  const maxPts = Math.max(...allPlayers.map(p => p.pts), 1)
  const maxReb = Math.max(...allPlayers.map(p => p.reb), 1)
  const maxAst = Math.max(...allPlayers.map(p => p.ast), 1)

  const statBars = [
    { label: 'PTS', value: player.pts, max: maxPts, color: 'var(--accent)' },
    { label: 'REB', value: player.reb, max: maxReb, color: 'var(--nba)' },
    { label: 'AST', value: player.ast, max: maxAst, color: 'var(--ncaa)' },
    { label: 'STL', value: player.stl, max: Math.max(...allPlayers.map(p => p.stl), 1), color: '#a855f7' },
    { label: 'BLK', value: player.blk, max: Math.max(...allPlayers.map(p => p.blk), 1), color: '#f97316' },
  ]

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      {/* Main spotlight card */}
      <div style={{
        padding: 24,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 24,
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Player photo + info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 80 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#1a1a1a',
            border: `2px solid ${player.isHome ? 'var(--nba)' : 'var(--ncaa)'}`,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {player.headshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.headshot} alt={player.name} width={72} height={72} style={{ objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 28, color: 'var(--border)' }}>?</span>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9,
              color: player.isHome ? 'var(--nba)' : 'var(--ncaa)',
              letterSpacing: '1px',
            }}>
              {player.teamAbbr}
            </div>
            {player.starter && (
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 8, color: 'var(--muted)', marginTop: 2 }}>
                STARTER
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>
              {player.name}
            </div>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
              {player.min} MIN · {player.fg} FG
            </div>
          </div>

          {/* Animated stat bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {statBars.map(({ label, value, max, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)', letterSpacing: '1px' }}>{label}</span>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color, fontWeight: 600 }}>{value}</span>
                </div>
                <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(value / max) * barProgress * 100}%`,
                    background: color,
                    borderRadius: 2,
                    transition: 'none',
                    boxShadow: `0 0 6px ${color}`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player selector grid */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)', letterSpacing: '1px' }}>
            {activeIdx + 1} / {allPlayers.length}
          </span>
          <button
            onClick={() => setAutoRotate(r => !r)}
            style={{
              background: autoRotate ? 'rgba(232,255,71,0.1)' : 'transparent',
              border: '1px solid',
              borderColor: autoRotate ? 'var(--accent)' : 'var(--border)',
              color: autoRotate ? 'var(--accent)' : 'var(--muted)',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9,
              padding: '3px 8px',
              borderRadius: 3,
              cursor: 'pointer',
              letterSpacing: '1px',
            }}
          >
            {autoRotate ? '⏸ AUTO' : '▶ AUTO'}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allPlayers.map((p, i) => (
            <button
              key={i}
              onClick={() => { setActiveIdx(i); setAutoRotate(false) }}
              style={{
                background: i === activeIdx ? (p.isHome ? 'var(--nba)' : 'var(--ncaa)') : 'transparent',
                border: '1px solid',
                borderColor: i === activeIdx ? 'transparent' : 'var(--border)',
                color: i === activeIdx ? '#000' : 'var(--muted)',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 9,
                padding: '4px 8px',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontWeight: i === activeIdx ? 600 : 400,
              }}
            >
              {p.shortName} <span style={{ opacity: 0.7 }}>{p.pts}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MomentumTracker({ plays, homeName, awayName, homeAbbr, awayAbbr, homeScore, awayScore }) {
  const [animStep, setAnimStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(80)

  // Build scoring snapshots from plays
  const snapshots = useMemo(() => {
    const result = [{ away: 0, home: 0, label: 'START', text: '', period: 1 }]
    for (const play of plays) {
      if (!play.scoringPlay) continue
      const away = Number(play.awayScore ?? result[result.length - 1].away)
      const home = Number(play.homeScore ?? result[result.length - 1].home)
      const period = play.period?.number ?? play.period ?? 1
      const periodLabel = period > 4 ? `OT${period - 4}` : `Q${period}`
      const clock = play.clock?.displayValue ?? play.clock ?? ''
      const team = play.team?.abbreviation || ''
      const text = play.text || play.description || ''
      result.push({ away, home, label: `${periodLabel} ${clock}`, text, team, period })
    }
    return result
  }, [plays])

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return
    if (animStep >= snapshots.length - 1) {
      setIsPlaying(false)
      return
    }
    const timer = setTimeout(() => setAnimStep(s => s + 1), speed)
    return () => clearTimeout(timer)
  }, [isPlaying, animStep, snapshots.length, speed])

  const current = snapshots[animStep] || snapshots[0]
  const total = Math.max(current.away + current.home, 1)
  const maxScore = Math.max(
    ...snapshots.map(s => Math.max(s.away, s.home)), 1
  )

  // Momentum: diff swings between -1 (all away) and +1 (all home)
  const diff = current.home - current.away
  const maxDiff = Math.max(...snapshots.map(s => Math.abs(s.home - s.away)), 1)
  const momentum = diff / Math.max(maxDiff, 20) // normalize to ~[-1, 1]
  const barPercent = 50 + (momentum * 50) // 0-100, 50 = tied

  // Build score chart data (every snapshot)
  const chartWidth = 560
  const chartHeight = 80

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '24px',
    }}>
      {/* Team labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: 'var(--ncaa)', letterSpacing: '1px' }}>{awayAbbr}</span>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 28, fontWeight: 600, color: current.away > current.home ? 'var(--accent)' : '#666', transition: 'color 0.3s' }}>{current.away}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'var(--muted)', letterSpacing: '1px' }}>{current.label}</div>
          {current.text && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, maxWidth: 200, lineHeight: 1.4 }}>{current.text}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 28, fontWeight: 600, color: current.home > current.away ? 'var(--accent)' : '#666', transition: 'color 0.3s' }}>{current.home}</span>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: 'var(--nba)', letterSpacing: '1px' }}>{homeAbbr}</span>
        </div>
      </div>

      {/* Momentum bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', height: 28, background: '#1a1a1a', borderRadius: 14, overflow: 'hidden' }}>
          {/* Away side fill */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${Math.max(0, 50 - barPercent + 50)}%`,
            background: 'var(--ncaa)',
            opacity: 0.7,
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            borderRadius: '14px 0 0 14px',
          }} />
          {/* Home side fill */}
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: `${Math.max(0, barPercent - 50)}%`,
            background: 'var(--nba)',
            opacity: 0.7,
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            borderRadius: '0 14px 14px 0',
          }} />
          {/* Center line */}
          <div style={{
            position: 'absolute', left: '50%', top: '15%', bottom: '15%',
            width: 2, background: 'var(--border)', transform: 'translateX(-50%)',
          }} />
          {/* Marker */}
          <div style={{
            position: 'absolute',
            left: `calc(${barPercent}% - 10px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 20, height: 20,
            background: 'var(--accent)',
            borderRadius: '50%',
            transition: 'left 0.5s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: '0 0 8px rgba(232,255,71,0.6)',
            zIndex: 2,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--ncaa)' }}>{awayAbbr} LEADS</span>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)' }}>TIED</span>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--nba)' }}>{homeAbbr} LEADS</span>
        </div>
      </div>

      {/* Score chart — SVG line graph */}
      <div style={{ marginBottom: 20, overflowX: 'auto' }}>
        <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} style={{ display: 'block' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <line key={t}
              x1={0} y1={chartHeight * (1 - t)}
              x2={chartWidth} y2={chartHeight * (1 - t)}
              stroke="var(--border)" strokeWidth={0.5}
            />
          ))}

          {/* Period dividers */}
          {[1, 2, 3, 4].map(p => {
            const periodStart = snapshots.findIndex(s => s.period > p)
            if (periodStart < 1) return null
            const x = (periodStart / (snapshots.length - 1)) * chartWidth
            return (
              <g key={p}>
                <line x1={x} y1={0} x2={x} y2={chartHeight} stroke="#333" strokeWidth={1} strokeDasharray="3,3" />
                <text x={x + 4} y={10} fill="#444" fontSize={8} fontFamily="IBM Plex Mono, monospace">Q{p + 1}</text>
              </g>
            )
          })}

          {/* Away score line */}
          <polyline
            fill="none"
            stroke="var(--ncaa)"
            strokeWidth={1.5}
            opacity={0.8}
            points={snapshots.slice(0, animStep + 1).map((s, i) => {
              const x = (i / Math.max(snapshots.length - 1, 1)) * chartWidth
              const y = chartHeight - (s.away / maxScore) * chartHeight
              return `${x},${y}`
            }).join(' ')}
          />

          {/* Home score line */}
          <polyline
            fill="none"
            stroke="var(--nba)"
            strokeWidth={1.5}
            opacity={0.8}
            points={snapshots.slice(0, animStep + 1).map((s, i) => {
              const x = (i / Math.max(snapshots.length - 1, 1)) * chartWidth
              const y = chartHeight - (s.home / maxScore) * chartHeight
              return `${x},${y}`
            }).join(' ')}
          />

          {/* Current position dot - away */}
          {animStep > 0 && (() => {
            const s = snapshots[animStep]
            const x = (animStep / Math.max(snapshots.length - 1, 1)) * chartWidth
            const y = chartHeight - (s.away / maxScore) * chartHeight
            return <circle cx={x} cy={y} r={4} fill="var(--ncaa)" />
          })()}

          {/* Current position dot - home */}
          {animStep > 0 && (() => {
            const s = snapshots[animStep]
            const x = (animStep / Math.max(snapshots.length - 1, 1)) * chartWidth
            const y = chartHeight - (s.home / maxScore) * chartHeight
            return <circle cx={x} cy={y} r={4} fill="var(--nba)" />
          })()}

          {/* Legend */}
          <circle cx={8} cy={chartHeight + 14} r={4} fill="var(--ncaa)" />
          <text x={16} y={chartHeight + 17} fill="#888" fontSize={9} fontFamily="IBM Plex Mono, monospace">{awayAbbr}</text>
          <circle cx={50} cy={chartHeight + 14} r={4} fill="var(--nba)" />
          <text x={58} y={chartHeight + 17} fill="#888" fontSize={9} fontFamily="IBM Plex Mono, monospace">{homeAbbr}</text>
        </svg>
      </div>

      {/* Scrubber */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="range"
          min={0}
          max={snapshots.length - 1}
          value={animStep}
          onChange={e => { setAnimStep(Number(e.target.value)); setIsPlaying(false) }}
          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)' }}>START</span>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)' }}>
            {animStep} / {snapshots.length - 1} PLAYS
          </span>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)' }}>FINAL</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => { setAnimStep(0); setIsPlaying(false) }}
          style={ctrlBtn}
        >⏮</button>
        <button
          onClick={() => setAnimStep(s => Math.max(0, s - 1))}
          style={ctrlBtn}
        >◀</button>
        <button
          onClick={() => {
            if (animStep >= snapshots.length - 1) setAnimStep(0)
            setIsPlaying(p => !p)
          }}
          style={{ ...ctrlBtn, background: 'var(--accent)', color: '#000', minWidth: 64 }}
        >
          {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
        </button>
        <button
          onClick={() => setAnimStep(s => Math.min(snapshots.length - 1, s + 1))}
          style={ctrlBtn}
        >▶</button>
        <button
          onClick={() => { setAnimStep(snapshots.length - 1); setIsPlaying(false) }}
          style={ctrlBtn}
        >⏭</button>

        {/* Speed control */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)' }}>SPEED</span>
          {[200, 100, 50].map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              ...ctrlBtn,
              borderColor: speed === s ? 'var(--accent)' : 'var(--border)',
              color: speed === s ? 'var(--accent)' : 'var(--muted)',
              fontSize: 9,
            }}>
              {s === 200 ? '1×' : s === 100 ? '2×' : '4×'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const ctrlBtn = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 11,
  padding: '5px 10px',
  borderRadius: 3,
  cursor: 'pointer',
}

function PlayByPlay({ plays, homeAbbr, awayAbbr }) {
  const [filter, setFilter] = useState('ALL')

  // ESPN plays are oldest-first, we want newest-first
  const reversed = [...plays].reverse()

  // Group by period — normalize period to number first
  const periods = {}
  for (const play of reversed) {
    const p = (play.period?.number ?? play.period ?? 0)
    const label = p === 0 ? 'PRE' : p > 4 ? `OT${p - 4}` : `Q${p}`
    if (!periods[label]) periods[label] = []
    periods[label].push(play)
  }

  const periodKeys = Object.keys(periods)
  const activeFilter = filter === 'ALL' || !periodKeys.includes(filter) ? 'ALL' : filter
  const displayPeriods = activeFilter === 'ALL' ? periodKeys : [activeFilter]

  return (
    <div>
      {/* Period filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['ALL', ...periodKeys].map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            style={{
              background: (activeFilter === 'ALL' && p === 'ALL') || activeFilter === p
                ? 'var(--accent)' : 'transparent',
              border: '1px solid',
              borderColor: (activeFilter === 'ALL' && p === 'ALL') || activeFilter === p
                ? 'var(--accent)' : 'var(--border)',
              color: (activeFilter === 'ALL' && p === 'ALL') || activeFilter === p
                ? '#000' : 'var(--muted)',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10,
              letterSpacing: '1px',
              padding: '4px 10px',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Plays list */}
      {displayPeriods.map(period => (
        <div key={period} style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 10,
            color: 'var(--muted)',
            letterSpacing: '2px',
            marginBottom: 8,
            paddingBottom: 6,
            borderBottom: '1px solid var(--border)',
          }}>
            {period}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {periods[period].map((play, i) => {
              const teamAbbr = play.team?.abbreviation || ''
              const isHome = teamAbbr === homeAbbr
              const isAway = teamAbbr === awayAbbr
              const isScoring = play.scoringPlay
              const clock = play.clock?.displayValue || play.clock || ''
              const description = play.text || play.description || ''
              const awayScore = Number(play.awayScore ?? 0)
              const homeScore = Number(play.homeScore ?? 0)
              const athlete = play.participants?.[0]?.athlete

              return (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr auto',
                  alignItems: 'start',
                  gap: 12,
                  padding: '8px 10px',
                  borderRadius: 3,
                  background: isScoring ? 'rgba(232,255,71,0.04)' : 'transparent',
                  borderLeft: isScoring ? '2px solid var(--accent)' : '2px solid transparent',
                }}>
                  {/* Clock */}
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10,
                    color: 'var(--muted)',
                    paddingTop: 1,
                    flexShrink: 0,
                  }}>
                    {clock}
                  </span>

                  {/* Play description */}
                  <div>
                    {teamAbbr && (
                      <span style={{
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: 9,
                        color: isHome ? 'var(--nba)' : 'var(--ncaa)',
                        marginRight: 6,
                        letterSpacing: '1px',
                      }}>
                        {teamAbbr}
                      </span>
                    )}
                    <span style={{
                      fontSize: 12,
                      color: isScoring ? 'var(--text)' : '#999',
                      fontWeight: isScoring ? 500 : 400,
                    }}>
                      {description}
                    </span>
                    {athlete && (
                      <span style={{
                        marginLeft: 6,
                        fontSize: 10,
                        fontFamily: '"IBM Plex Mono", monospace',
                        color: 'var(--muted)',
                      }}>
                        — {athlete.shortName || athlete.displayName}
                      </span>
                    )}
                  </div>

                  {/* Score */}
                  {awayScore !== null && homeScore !== null && (
                    <span style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 11,
                      color: isScoring ? 'var(--accent)' : 'var(--muted)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {awayScore}–{homeScore}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
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
      if (res.ok) {
        summary = await res.json()
      }
    } catch (e) {
      // summary not available
    }

    const initialLinescores = eventRaw?.competitions?.[0]?.competitors || []
    const debugInfo = null
    return {
      props: {
        game,
        summary,
        league,
        debugInfo,
        initialLinescores,
      }
    }
  } catch (err) {
    console.error(err)
    return { props: { game: null, summary: null, league, debugInfo: null } }
  }
}
