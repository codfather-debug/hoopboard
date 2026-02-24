import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { parseGame, getNBAScoreboard, getNCAA_MBScoreboard } from '../../../lib/espn'

export default function GamePage({ game: initialGame, summary: initialSummary, league, debugInfo }) {
  const [mounted, setMounted] = useState(false)
  const [showPlays, setShowPlays] = useState(false)
  const [showMomentum, setShowMomentum] = useState(false)
  const [showCourt, setShowCourt] = useState(false)
  const [game, setGame] = useState(initialGame)
  const [plays, setPlays] = useState(initialSummary?.plays || [])
  const [leaders, setLeaders] = useState(initialSummary?.leaders || [])
  const [playerStats, setPlayerStats] = useState(initialSummary?.boxscore?.players || [])
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

          {/* Court Animation */}
          {plays.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SectionHead text="LIVE COURT" />
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
                        animation: 'pulse 1.5s infinite',
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
                <CourtAnimation
                  plays={plays}
                  homeAbbr={game.home.abbr}
                  awayAbbr={game.away.abbr}
                  homeLogo={game.home.logo}
                  awayLogo={game.away.logo}
                  isLive={game.isLive}
                  lastUpdated={lastUpdated}
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

function CourtAnimation({ plays, homeAbbr, awayAbbr, homeLogo, awayLogo, isLive, lastUpdated }) {
  const [currentPlayIdx, setCurrentPlayIdx] = useState(null)
  const [particles, setParticles] = useState([])
  const [autoPlay, setAutoPlay] = useState(isLive)
  const [speed, setSpeed] = useState(1500)
  const timerRef = useRef(null)
  const particleId = useRef(0)

  // Only scoring plays
  const scoringPlays = useMemo(() =>
    plays.filter(p => p.scoringPlay),
  [plays])

  // Detect play type from description text
  const getPlayType = (text = '') => {
    const t = text.toLowerCase()
    if (t.includes('three') || t.includes('3-pt') || t.includes('3pt')) return '3PT'
    if (t.includes('free throw') || t.includes('foul shot')) return 'FT'
    if (t.includes('dunk')) return 'DUNK'
    if (t.includes('layup') || t.includes('lay up')) return 'LAYUP'
    if (t.includes('alley')) return 'ALLEY-OOP'
    if (t.includes('hook')) return 'HOOK'
    return 'JUMP SHOT'
  }

  // Estimate shot position from play type and team
  // Court is 500x270, home basket right side, away basket left side
  const getShotOrigin = (play, type) => {
    const isHome = play.team?.abbreviation === homeAbbr
    const baseX = isHome ? 380 : 120  // which half
    const jitter = () => (Math.random() - 0.5) * 60

    if (type === '3PT') return { x: baseX + (isHome ? -60 : 60) + jitter(), y: 135 + jitter() * 1.5 }
    if (type === 'FT') return { x: isHome ? 340 : 160, y: 135 }
    if (type === 'DUNK' || type === 'LAYUP' || type === 'ALLEY-OOP') return { x: isHome ? 455 : 45, y: 135 + jitter() * 0.3 }
    return { x: baseX + jitter() * 0.5, y: 135 + jitter() }
  }

  const getBasketPos = (isHome) => ({ x: isHome ? 472 : 28, y: 135 })

  const firePlay = useCallback((idx) => {
    if (idx < 0 || idx >= scoringPlays.length) return
    const play = scoringPlays[idx]
    const type = getPlayType(play.text)
    const isHome = play.team?.abbreviation === homeAbbr
    const origin = getShotOrigin(play, type)
    const basket = getBasketPos(isHome)
    const id = ++particleId.current

    setCurrentPlayIdx(idx)
    setParticles(prev => [...prev.slice(-8), {
      id, origin, basket, type, isHome,
      text: play.text || '',
      away: play.awayScore,
      home: play.homeScore,
      team: play.team?.abbreviation || '',
      born: Date.now(),
    }])
  }, [scoringPlays, homeAbbr])

  // Auto-advance
  useEffect(() => {
    if (!autoPlay) { clearTimeout(timerRef.current); return }
    const next = (currentPlayIdx ?? -1) + 1
    if (next >= scoringPlays.length) { setAutoPlay(false); return }
    timerRef.current = setTimeout(() => firePlay(next), speed)
    return () => clearTimeout(timerRef.current)
  }, [autoPlay, currentPlayIdx, scoringPlays.length, speed, firePlay])

  // When live data updates, jump to latest
  useEffect(() => {
    if (isLive && scoringPlays.length > 0) {
      const latest = scoringPlays.length - 1
      setCurrentPlayIdx(latest)
      firePlay(latest)
    }
  }, [lastUpdated]) // eslint-disable-line

  const current = currentPlayIdx !== null ? scoringPlays[currentPlayIdx] : null

  const W = 500, H = 270

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: 24,
      userSelect: 'none',
    }}>
      {/* Current play callout */}
      <div style={{
        minHeight: 48,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        {current ? (
          <>
            <div>
              <div style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 10,
                color: current.team === homeAbbr ? 'var(--nba)' : 'var(--ncaa)',
                letterSpacing: '1px',
                marginBottom: 4,
              }}>
                {current.team} · {getPlayType(current.text)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                {current.text}
              </div>
            </div>
            <div style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--accent)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {current.awayScore}–{current.homeScore}
            </div>
          </>
        ) : (
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: 'var(--muted)' }}>
            PRESS PLAY TO REPLAY SCORING PLAYS
          </div>
        )}
      </div>

      {/* Court SVG */}
      <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', display: 'block', background: '#0d1a0d' }}
        >
          {/* Court floor */}
          <rect x={0} y={0} width={W} height={H} fill="#0d1a0d" />

          {/* Court outline */}
          <rect x={10} y={10} width={W - 20} height={H - 20}
            fill="none" stroke="#1a3a1a" strokeWidth={2} rx={4} />

          {/* Half court line */}
          <line x1={W/2} y1={10} x2={W/2} y2={H - 10} stroke="#1a3a1a" strokeWidth={1.5} />

          {/* Center circle */}
          <circle cx={W/2} cy={H/2} r={40} fill="none" stroke="#1a3a1a" strokeWidth={1.5} />
          <circle cx={W/2} cy={H/2} r={4} fill="#1a3a1a" />

          {/* Left paint / key */}
          <rect x={10} y={H/2 - 60} width={100} height={120}
            fill="none" stroke="#1a3a1a" strokeWidth={1.5} />
          {/* Left free throw circle */}
          <path d={`M 110 ${H/2 - 40} A 40 40 0 0 1 110 ${H/2 + 40}`}
            fill="none" stroke="#1a3a1a" strokeWidth={1.5} />
          {/* Left 3pt arc */}
          <path d={`M 10 ${H/2 - 90} L 65 ${H/2 - 90} A 100 100 0 0 1 65 ${H/2 + 90} L 10 ${H/2 + 90}`}
            fill="none" stroke="#1a3a1a" strokeWidth={1.5} />
          {/* Left basket */}
          <circle cx={28} cy={H/2} r={8} fill="none" stroke="#2a5a2a" strokeWidth={2} />
          <circle cx={28} cy={H/2} r={2} fill="#2a5a2a" />

          {/* Right paint / key */}
          <rect x={W - 110} y={H/2 - 60} width={100} height={120}
            fill="none" stroke="#1a3a1a" strokeWidth={1.5} />
          {/* Right free throw circle */}
          <path d={`M ${W - 110} ${H/2 - 40} A 40 40 0 0 0 ${W - 110} ${H/2 + 40}`}
            fill="none" stroke="#1a3a1a" strokeWidth={1.5} />
          {/* Right 3pt arc */}
          <path d={`M ${W - 10} ${H/2 - 90} L ${W - 65} ${H/2 - 90} A 100 100 0 0 0 ${W - 65} ${H/2 + 90} L ${W - 10} ${H/2 + 90}`}
            fill="none" stroke="#1a3a1a" strokeWidth={1.5} />
          {/* Right basket */}
          <circle cx={W - 28} cy={H/2} r={8} fill="none" stroke="#2a5a2a" strokeWidth={2} />
          <circle cx={W - 28} cy={H/2} r={2} fill="#2a5a2a" />

          {/* Team labels */}
          <text x={40} y={22} textAnchor="middle" fill="#2a5a2a" fontSize={9}
            fontFamily="IBM Plex Mono, monospace">{awayAbbr}</text>
          <text x={W - 40} y={22} textAnchor="middle" fill="#2a5a2a" fontSize={9}
            fontFamily="IBM Plex Mono, monospace">{homeAbbr}</text>

          {/* Particles — shot arcs */}
          {particles.map(p => (
            <ShotParticle key={p.id} particle={p} W={W} H={H} />
          ))}
        </svg>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <button onClick={() => { setCurrentPlayIdx(null); setParticles([]); setAutoPlay(false) }} style={ctrlBtn}>⏮</button>
        <button onClick={() => { const prev = (currentPlayIdx ?? 0) - 1; if (prev >= 0) firePlay(prev) }} style={ctrlBtn}>◀</button>
        <button
          onClick={() => {
            if (currentPlayIdx !== null && currentPlayIdx >= scoringPlays.length - 1) {
              setCurrentPlayIdx(null)
              setParticles([])
              setTimeout(() => setAutoPlay(true), 100)
            } else {
              setAutoPlay(p => !p)
            }
          }}
          style={{ ...ctrlBtn, background: autoPlay ? 'var(--live)' : 'var(--accent)', color: '#000', minWidth: 72 }}
        >
          {autoPlay ? '⏸ PAUSE' : '▶ PLAY'}
        </button>
        <button onClick={() => { const next = (currentPlayIdx ?? -1) + 1; if (next < scoringPlays.length) firePlay(next) }} style={ctrlBtn}>▶</button>
        <button onClick={() => firePlay(scoringPlays.length - 1)} style={ctrlBtn}>⏭</button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)' }}>SPEED</span>
          {[2000, 1200, 600].map((s, i) => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              ...ctrlBtn,
              borderColor: speed === s ? 'var(--accent)' : 'var(--border)',
              color: speed === s ? 'var(--accent)' : 'var(--muted)',
              fontSize: 9, padding: '4px 8px',
            }}>
              {['1×', '2×', '4×'][i]}
            </button>
          ))}
        </div>

        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)', marginLeft: 8 }}>
          {currentPlayIdx !== null ? currentPlayIdx + 1 : 0}/{scoringPlays.length}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        {[
          { color: 'var(--ncaa)', label: awayAbbr },
          { color: 'var(--nba)', label: homeAbbr },
          { color: 'var(--accent)', label: '3PT' },
          { color: 'var(--live)', label: 'DUNK/LAYUP' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ShotParticle({ particle, W, H }) {
  const { origin, basket, type, isHome, born } = particle
  const [t, setT] = useState(0)
  const rafRef = useRef(null)
  const duration = 900

  useEffect(() => {
    const start = performance.now()
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setT(progress)
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Ease in-out
  const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  const x = origin.x + (basket.x - origin.x) * ease
  // Parabolic arc — peaks in the middle
  const arcHeight = type === '3PT' ? 70 : type === 'FT' ? 60 : 45
  const y = origin.y + (basket.y - origin.y) * ease - Math.sin(ease * Math.PI) * arcHeight

  const opacity = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1
  const size = t > 0.8 ? 6 + (1 - t) * 20 : 6

  const color = type === '3PT' ? 'var(--accent)'
    : type === 'DUNK' || type === 'LAYUP' || type === 'ALLEY-OOP' ? 'var(--live)'
    : isHome ? 'var(--nba)' : 'var(--ncaa)'

  // Trail dots
  const trail = [0.15, 0.3, 0.45].map((offset) => {
    const tp = Math.max(0, ease - offset)
    const tx = origin.x + (basket.x - origin.x) * tp
    const ty = origin.y + (basket.y - origin.y) * tp - Math.sin(tp * Math.PI) * arcHeight
    return { tx, ty, opacity: opacity * (1 - offset / 0.5) * 0.4 }
  })

  if (t === 0) return null

  return (
    <g>
      {/* Trail */}
      {trail.map((tr, i) => (
        <circle key={i} cx={tr.tx} cy={tr.ty} r={3} fill={color} opacity={tr.opacity} />
      ))}
      {/* Main ball */}
      <circle cx={x} cy={y} r={size / 2} fill={color} opacity={opacity} />
      {/* Glow */}
      <circle cx={x} cy={y} r={size} fill={color} opacity={opacity * 0.15} />
      {/* Points burst at basket */}
      {t > 0.85 && (
        <text
          x={basket.x}
          y={basket.y - 10 - (t - 0.85) * 80}
          textAnchor="middle"
          fill={color}
          fontSize={12}
          fontFamily="IBM Plex Mono, monospace"
          fontWeight={600}
          opacity={1 - (t - 0.85) / 0.15}
        >
          {type === '3PT' ? '+3' : type === 'FT' ? '+1' : '+2'}
        </text>
      )}
    </g>
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
      const away = play.awayScore ?? result[result.length - 1].away
      const home = play.homeScore ?? result[result.length - 1].home
      const period = play.period?.number || play.period || 1
      const periodLabel = period > 4 ? `OT${period - 4}` : `Q${period}`
      const clock = play.clock?.displayValue || ''
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

  // Group by period
  const periods = {}
  for (const play of reversed) {
    const p = play.period?.number || play.period || 0
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
              const clock = play.clock?.displayValue || ''
              const description = play.text || play.description || ''
              const awayScore = play.awayScore ?? null
              const homeScore = play.homeScore ?? null
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

    const debugInfo = null
    return {
      props: {
        game,
        summary,
        league,
        debugInfo,
      }
    }
  } catch (err) {
    console.error(err)
    return { props: { game: null, summary: null, league, debugInfo: null } }
  }
}
