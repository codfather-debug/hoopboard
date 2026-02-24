import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getNBAScoreboard, getNCAA_MBScoreboard, parseGame } from '../lib/espn'

export default function Home({ nbaGames, ncaaGames, fetchedAt, dateStr }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const now = new Date(fetchedAt)
  const timeStr = mounted ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''

  // Date navigation helpers
  const getDateLabel = () => {
    if (!mounted) return ''
    if (!dateStr) return 'TODAY'
    const d = new Date(
      parseInt(dateStr.slice(0,4)),
      parseInt(dateStr.slice(4,6)) - 1,
      parseInt(dateStr.slice(6,8))
    )
    const today = new Date()
    today.setHours(0,0,0,0)
    const diff = Math.round((d - today) / 86400000)
    if (diff === -1) return 'YESTERDAY'
    if (diff === 1) return 'TOMORROW'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  }

  const shiftDate = (days) => {
    const base = dateStr
      ? new Date(
          parseInt(dateStr.slice(0,4)),
          parseInt(dateStr.slice(4,6)) - 1,
          parseInt(dateStr.slice(6,8))
        )
      : new Date()
    base.setDate(base.getDate() + days)
    const y = base.getFullYear()
    const m = String(base.getMonth() + 1).padStart(2, '0')
    const d = String(base.getDate()).padStart(2, '0')
    const newDate = `${y}${m}${d}`
    // Check if it's today — if so, remove date param
    const today = new Date()
    const todayStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`
    return newDate === todayStr ? '/' : `/?date=${newDate}`
  }

  return (
    <>
      <Head>
        <title>HoopBoard</title>
        <meta name="description" content="NBA & NCAA Men's Basketball Scores" />
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
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--accent)',
              letterSpacing: '-0.5px'
            }}>HOOPBOARD</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: '"IBM Plex Mono", monospace' }}>
              NBA + NCAA MEN'S
            </span>
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
            UPDATED {timeStr} · <RefreshLink />
          </div>
        </header>

        <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
          {/* NBA Section */}
          <Section
            label="NBA"
            color="var(--nba)"
            games={nbaGames}
            league="nba"
          />

          <div style={{ height: 40 }} />

          {/* NCAA Section */}
          <Section
            label="NCAAM"
            color="var(--ncaa)"
            games={ncaaGames}
            league="ncaa"
          />
        </main>
      </div>
    </>
  )
}

function RefreshLink() {
  return (
    <a
      href="/"
      style={{ color: 'var(--accent)', textDecoration: 'none', fontFamily: '"IBM Plex Mono", monospace' }}
    >
      REFRESH
    </a>
  )
}

function Section({ label, color, games, league }) {
  const live = games.filter(g => g.isLive)
  const scheduled = games.filter(g => g.isScheduled)
  const final = games.filter(g => g.isFinal)

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 11,
          fontWeight: 600,
          color,
          letterSpacing: '2px',
          borderLeft: `3px solid ${color}`,
          paddingLeft: 10,
        }}>
          {label}
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: '"IBM Plex Mono", monospace' }}>
          {games.length} GAMES
        </span>
      </div>

      {live.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <GroupLabel text="LIVE" dot />
          <GameGrid games={live} league={league} />
        </div>
      )}

      {final.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <GroupLabel text="FINAL" />
          <GameGrid games={final} league={league} />
        </div>
      )}

      {scheduled.length > 0 && (
        <div>
          <GroupLabel text="UPCOMING" />
          <GameGrid games={scheduled} league={league} />
        </div>
      )}

      {games.length === 0 && (
        <div style={{
          padding: '40px 0',
          textAlign: 'center',
          color: 'var(--muted)',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 12
        }}>
          NO GAMES TODAY
        </div>
      )}
    </section>
  )
}

function GroupLabel({ text, dot }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    }}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--live)',
          display: 'inline-block',
          animation: 'pulse 1.5s infinite',
        }} />
      )}
      <span style={{
        fontSize: 10,
        color: dot ? 'var(--live)' : 'var(--muted)',
        fontFamily: '"IBM Plex Mono", monospace',
        letterSpacing: '2px',
      }}>{text}</span>
    </div>
  )
}

function GameGrid({ games, league }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 8,
    }}>
      {games.map(game => (
        <GameCard key={game.id} game={game} league={league} />
      ))}
    </div>
  )
}

function GameCard({ game, league }) {
  const hasScore = game.home.score !== null && game.away.score !== null
  const homeWins = hasScore && Number(game.home.score) > Number(game.away.score)
  const awayWins = hasScore && Number(game.away.score) > Number(game.home.score)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const timeDisplay = game.isScheduled
    ? (mounted ? new Date(game.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : '')
    : game.isLive
    ? game.period > 0 ? `Q${game.period} ${game.clock}` : (game.statusText || 'LIVE')
    : 'FINAL'

  return (
    <Link href={`/game/${league}/${game.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        ':hover': { borderColor: 'var(--muted)' }
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
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
          {team.rank && (
            <span style={{
              fontSize: 9,
              fontFamily: '"IBM Plex Mono", monospace',
              color: 'var(--muted)',
              marginRight: 4,
            }}>#{team.rank}</span>
          )}
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
            <div style={{
              fontSize: 10,
              fontFamily: '"IBM Plex Mono", monospace',
              color: 'var(--muted)',
            }}>
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
  const dateStr = query.date || null // expects YYYYMMDD

  try {
    const [nbaRaw, ncaaRaw] = await Promise.all([
      getNBAScoreboard(dateStr),
      getNCAA_MBScoreboard(dateStr),
    ])

    const nbaGames = nbaRaw.map(e => parseGame(e, 'nba')).filter(Boolean)
    const ncaaGames = ncaaRaw.map(e => parseGame(e, 'ncaa')).filter(Boolean)

    return {
      props: {
        nbaGames,
        ncaaGames,
        fetchedAt: new Date().toISOString(),
        dateStr: dateStr || null,
      }
    }
  } catch (err) {
    console.error(err)
    return {
      props: { nbaGames: [], ncaaGames: [], fetchedAt: new Date().toISOString(), dateStr: null }
    }
  }
}
