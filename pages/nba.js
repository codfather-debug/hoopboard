import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getNBAScoreboard, parseGame, getGameSummary, getFirstScorer } from '../lib/espn'

export default function NBAPage({ games, fetchedAt, dateStr }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const now = new Date(fetchedAt)
  const timeStr = mounted
    ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : ''

  const getDateLabel = () => {
    if (!mounted) return ''
    if (!dateStr) return 'TODAY'
    const d = new Date(
      parseInt(dateStr.slice(0, 4)),
      parseInt(dateStr.slice(4, 6)) - 1,
      parseInt(dateStr.slice(6, 8))
    )
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.round((d - today) / 86400000)
    if (diff === -1) return 'YESTERDAY'
    if (diff === 1) return 'TOMORROW'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  }

  const shiftDate = (days) => {
    const base = dateStr
      ? new Date(
          parseInt(dateStr.slice(0, 4)),
          parseInt(dateStr.slice(4, 6)) - 1,
          parseInt(dateStr.slice(6, 8))
        )
      : new Date()
    base.setDate(base.getDate() + days)
    const y = base.getFullYear()
    const m = String(base.getMonth() + 1).padStart(2, '0')
    const d = String(base.getDate()).padStart(2, '0')
    const newDate = `${y}${m}${d}`
    const today = new Date()
    const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    return newDate === todayStr ? '/nba' : `/nba?date=${newDate}`
  }

  const live = games.filter(g => g.isLive)
  const final = games.filter(g => g.isFinal)
  const scheduled = games.filter(g => g.isScheduled)

  return (
    <>
      <Head>
        <title>HoopBoard · NBA</title>
        <meta name="description" content="NBA scores with first-points tracker" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Header */}
        <header style={{
          borderBottom: '1px solid var(--border)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'var(--bg)',
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--muted)',
                letterSpacing: '-0.5px',
              }}>HOOPBOARD</span>
            </Link>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--nba)',
              letterSpacing: '1px',
            }}>/ NBA</span>
          </div>

          {/* Date navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href={mounted ? shiftDate(-1) : '#'} style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11,
              color: 'var(--muted)',
              textDecoration: 'none',
              padding: '4px 8px',
              border: '1px solid var(--border)',
              borderRadius: 3,
            }}>◀</Link>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11,
              color: 'var(--text)',
              minWidth: 90,
              textAlign: 'center',
              letterSpacing: '1px',
            }}>
              {mounted ? getDateLabel() : ''}
            </span>
            <Link href={mounted ? shiftDate(1) : '#'} style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11,
              color: 'var(--muted)',
              textDecoration: 'none',
              padding: '4px 8px',
              border: '1px solid var(--border)',
              borderRadius: 3,
            }}>▶</Link>
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: '"IBM Plex Mono", monospace' }}>
            UPDATED {timeStr} ·{' '}
            <a href={`/nba${dateStr ? `?date=${dateStr}` : ''}`}
              style={{ color: 'var(--accent)', textDecoration: 'none' }}>REFRESH</a>
          </div>
        </header>

        <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
          {/* First-Points legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 32,
            padding: '10px 14px',
            background: 'rgba(232,255,71,0.04)',
            border: '1px solid rgba(232,255,71,0.15)',
            borderRadius: 4,
          }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10,
              color: 'var(--accent)',
              letterSpacing: '1px',
            }}>FIRST POINTS</span>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10,
              color: 'var(--muted)',
            }}>— shows who drew first blood in each game</span>
          </div>

          {/* Grouped sections */}
          {live.length > 0 && (
            <GameSection label="LIVE" dot games={live} />
          )}
          {final.length > 0 && (
            <GameSection label="FINAL" games={final} />
          )}
          {scheduled.length > 0 && (
            <GameSection label="UPCOMING" games={scheduled} />
          )}

          {games.length === 0 && (
            <div style={{
              padding: '80px 0',
              textAlign: 'center',
              color: 'var(--muted)',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 12,
            }}>
              NO NBA GAMES TODAY
            </div>
          )}
        </main>
      </div>
    </>
  )
}

function GameSection({ label, dot, games }) {
  return (
    <div style={{ marginBottom: 40 }}>
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {dot && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--live)',
            display: 'inline-block',
            animation: 'pulse 1.5s infinite',
          }} />
        )}
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10,
          letterSpacing: '2px',
          color: dot ? 'var(--live)' : 'var(--muted)',
        }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'var(--muted)' }}>
          {games.length} {games.length === 1 ? 'GAME' : 'GAMES'}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 10,
      }}>
        {games.map(game => (
          <NBAGameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  )
}

function NBAGameCard({ game }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const hasScore = game.home.score !== null && game.away.score !== null
  const homeWins = hasScore && Number(game.home.score) > Number(game.away.score)
  const awayWins = hasScore && Number(game.away.score) > Number(game.home.score)

  const timeDisplay = game.isScheduled
    ? (mounted
        ? new Date(game.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          })
        : '')
    : game.isLive
    ? game.period > 0 ? `Q${game.period} ${game.clock}` : (game.statusText || 'LIVE')
    : 'FINAL'

  const { firstScorer } = game

  return (
    <Link href={`/game/nba/${game.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        {/* Score section */}
        <div style={{ padding: '14px 16px' }}>
          {/* Status row */}
          <div style={{
            fontSize: 10,
            fontFamily: '"IBM Plex Mono", monospace',
            color: game.isLive ? 'var(--live)' : 'var(--muted)',
            marginBottom: 10,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>{timeDisplay}</span>
            {game.networks[0] !== '—' && (
              <span style={{ color: 'var(--muted)' }}>{game.networks[0]}</span>
            )}
          </div>

          {/* Teams */}
          <TeamRow team={game.away} hasScore={hasScore} wins={awayWins} />
          <div style={{ height: 6 }} />
          <TeamRow team={game.home} hasScore={hasScore} wins={homeWins} />

          {/* Odds */}
          {game.odds && (
            <div style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid var(--border)',
              fontSize: 10,
              fontFamily: '"IBM Plex Mono", monospace',
              color: 'var(--muted)',
            }}>
              LINE: {game.odds}
            </div>
          )}
        </div>

        {/* First Points strip */}
        {firstScorer ? (
          <div style={{
            borderTop: '1px solid rgba(232,255,71,0.2)',
            background: 'rgba(232,255,71,0.04)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            {/* Headshot or fallback */}
            {firstScorer.headshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={firstScorer.headshot}
                alt={firstScorer.name || ''}
                width={32}
                height={32}
                style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'var(--border)' }}
              />
            ) : (
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--border)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: 'var(--muted)',
                fontFamily: '"IBM Plex Mono", monospace',
              }}>
                {firstScorer.name ? firstScorer.name[0] : '?'}
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '1px' }}>
                  ⚡ FIRST POINTS
                </span>
                {firstScorer.team && (
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: '"IBM Plex Mono", monospace' }}>
                    · {firstScorer.team}
                  </span>
                )}
              </div>
              {firstScorer.name && (
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {firstScorer.name}
                </div>
              )}
              {firstScorer.description && (
                <div style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  fontFamily: '"IBM Plex Mono", monospace',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {firstScorer.description}
                </div>
              )}
            </div>

            {/* Score at time of first points */}
            {firstScorer.awayScore !== null && firstScorer.homeScore !== null && (
              <div style={{
                flexShrink: 0,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                color: 'var(--accent)',
                fontWeight: 600,
              }}>
                {firstScorer.awayScore}–{firstScorer.homeScore}
              </div>
            )}
          </div>
        ) : !game.isScheduled ? (
          /* Game started but no scoring play found yet */
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 16px',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 10,
            color: 'var(--muted)',
          }}>
            ⚡ FIRST POINTS — PENDING
          </div>
        ) : (
          /* Scheduled game — show tipoff note */
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 16px',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 10,
            color: 'var(--muted)',
          }}>
            ⚡ FIRST POINTS — TIP OFF TO FIND OUT
          </div>
        )}
      </div>
    </Link>
  )
}

function TeamRow({ team, hasScore, wins }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {team.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logo}
            alt={team.abbr}
            width={22}
            height={22}
            style={{ objectFit: 'contain', flexShrink: 0 }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <span style={{
            fontSize: 14,
            fontWeight: wins ? 600 : 400,
            color: wins ? 'var(--text)' : '#999',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {team.name}
          </span>
          {team.record && (
            <div style={{ fontSize: 10, fontFamily: '"IBM Plex Mono", monospace', color: 'var(--muted)' }}>
              {team.record}
            </div>
          )}
        </div>
      </div>

      {hasScore && (
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 18,
          fontWeight: wins ? 600 : 400,
          color: wins ? 'var(--accent)' : '#666',
          flexShrink: 0,
        }}>
          {team.score}
        </span>
      )}
    </div>
  )
}

export async function getServerSideProps({ query }) {
  const dateStr = query.date || null

  try {
    const nbaRaw = await getNBAScoreboard(dateStr)
    const games = nbaRaw.map(e => parseGame(e, 'nba')).filter(Boolean)

    // Fetch summaries for live/final games in parallel to get first scorer
    const gamesWithScorer = await Promise.all(
      games.map(async (game) => {
        if (game.isScheduled) {
          return { ...game, firstScorer: null }
        }
        try {
          const summary = await getGameSummary('nba', game.id)
          const plays = summary?.plays || []
          const firstScorer = getFirstScorer(plays)
          return { ...game, firstScorer }
        } catch {
          return { ...game, firstScorer: null }
        }
      })
    )

    return {
      props: {
        games: gamesWithScorer,
        fetchedAt: new Date().toISOString(),
        dateStr: dateStr || null,
      },
    }
  } catch (err) {
    console.error(err)
    return {
      props: { games: [], fetchedAt: new Date().toISOString(), dateStr: null },
    }
  }
}
