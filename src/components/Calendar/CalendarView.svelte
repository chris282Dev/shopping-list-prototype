<script>
  let connected = false
  let loading = false
  let events = []
  let range = 'week'
  let error = ''

  // Google Calendar API Config – in firebase-config.js eintragen
  const CAL_API_KEY = ''
  const CAL_CLIENT_ID = ''

  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

  function loadGapi() {
    return new Promise((resolve) => {
      if (window.gapi) { resolve(); return }
      const s = document.createElement('script')
      s.src = 'https://apis.google.com/js/api.js'
      s.onload = resolve
      document.head.appendChild(s)
    })
  }

  async function connectCalendar() {
    if (!CAL_API_KEY || !CAL_CLIENT_ID) {
      error = 'Google Calendar API-Key und Client-ID sind noch nicht konfiguriert.'
      return
    }
    loading = true; error = ''
    try {
      await loadGapi()
      await new Promise(r => window.gapi.load('client:auth2', r))
      await window.gapi.client.init({ apiKey: CAL_API_KEY, clientId: CAL_CLIENT_ID, scope: SCOPES, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'] })
      await window.gapi.auth2.getAuthInstance().signIn()
      connected = true
      await loadEvents()
    } catch (e) {
      error = 'Verbindung fehlgeschlagen: ' + (e.error || e.message || 'Unbekannter Fehler')
    }
    loading = false
  }

  async function loadEvents() {
    loading = true
    try {
      const now = new Date()
      let timeMax = new Date()
      if (range === 'today') timeMax.setHours(23,59,59,999)
      else if (range === 'week') timeMax.setDate(now.getDate() + 7)
      else timeMax.setMonth(now.getMonth() + 1)

      const cals = await window.gapi.client.calendar.calendarList.list()
      const allEvents = []

      for (const cal of cals.result.items) {
        const res = await window.gapi.client.calendar.events.list({
          calendarId: cal.id,
          timeMin: now.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 30
        })
        ;(res.result.items || []).forEach(e => allEvents.push({ ...e, calendarName: cal.summary, calendarColor: cal.backgroundColor }))
      }

      events = allEvents.sort((a, b) => {
        const da = a.start?.dateTime || a.start?.date
        const db = b.start?.dateTime || b.start?.date
        return new Date(da) - new Date(db)
      })
    } catch (e) {
      error = 'Fehler beim Laden der Ereignisse.'
    }
    loading = false
  }

  function formatEventDate(event) {
    const start = event.start?.dateTime || event.start?.date
    if (!start) return ''
    const d = new Date(start)
    if (event.start?.date) return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
    return d.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }
</script>

<div class="view">
  {#if !connected}
    <div class="connect-screen">
      <div class="icon">📅</div>
      <h2>Google Kalender verbinden</h2>
      <p>Verbinde deinen Google Kalender, um Termine gemeinsam zu sehen.</p>
      {#if error}<div class="error-msg">{error}</div>{/if}
      {#if !CAL_API_KEY}
        <div class="config-hint">
          <strong>Konfiguration nötig:</strong> Trage den Google Calendar API-Key und die OAuth Client-ID in <code>src/lib/firebase.js</code> ein.
        </div>
      {/if}
      <button class="btn btn-primary" on:click={connectCalendar} disabled={loading}>
        {loading ? 'Verbinden…' : '📅 Kalender verbinden'}
      </button>
    </div>
  {:else}
    <div class="controls">
      <div class="range-tabs">
        {#each [['today','Heute'],['week','Woche'],['month','Monat']] as [val, label]}
          <button class="range-tab" class:active={range===val} on:click={() => { range=val; loadEvents() }}>{label}</button>
        {/each}
      </div>
      <button class="btn btn-ghost refresh-btn" on:click={loadEvents} disabled={loading}>⟳</button>
    </div>

    {#if error}<div class="error-msg" style="margin:0.75rem">{error}</div>{/if}

    <div class="scroll-area events-area">
      {#if loading}
        <div class="empty-state"><p>Termine werden geladen…</p></div>
      {:else if events.length === 0}
        <div class="empty-state">
          <div class="icon">🗓</div>
          <p>Keine Termine in diesem Zeitraum.</p>
        </div>
      {:else}
        {#each events as event (event.id)}
          <div class="event-card">
            <div class="event-color" style="background: {event.calendarColor || 'var(--color-primary)'}"></div>
            <div class="event-info">
              <div class="event-title">{event.summary || '(Kein Titel)'}</div>
              <div class="event-date">{formatEventDate(event)}</div>
              {#if event.location}<div class="event-location">📍 {event.location}</div>{/if}
              <div class="event-cal">{event.calendarName}</div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .view { display: flex; flex-direction: column; height: 100%; }
  .connect-screen { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center; gap: 0.75rem; }
  .connect-screen .icon { font-size: 3rem; }
  .connect-screen h2 { font-size: 1.3rem; }
  .connect-screen p { color: var(--color-text-muted); font-size: 0.9rem; max-width: 300px; }
  .config-hint { background: #fffde7; border: 1px solid var(--color-warning); border-radius: var(--radius-sm); padding: 0.75rem; font-size: 0.82rem; text-align: left; max-width: 340px; }
  .config-hint code { background: #f0f0f0; padding: 0.1rem 0.3rem; border-radius: 4px; }

  .controls { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
  .range-tabs { display: flex; gap: 0.35rem; flex: 1; }
  .range-tab { padding: 0.3rem 0.75rem; border-radius: 99px; font-size: 0.82rem; font-weight: 600; border: 1.5px solid var(--color-border); background: var(--color-bg); color: var(--color-text-muted); cursor: pointer; }
  .range-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
  .refresh-btn { padding: 0.3rem 0.6rem; }

  .events-area { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .event-card { display: flex; gap: 0; background: var(--color-surface); border-radius: var(--radius-sm); box-shadow: var(--shadow); overflow: hidden; }
  .event-color { width: 4px; flex-shrink: 0; }
  .event-info { padding: 0.65rem 0.85rem; flex: 1; }
  .event-title { font-size: 0.9rem; font-weight: 600; }
  .event-date { font-size: 0.78rem; color: var(--color-primary); font-weight: 600; margin-top: 0.15rem; }
  .event-location { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.1rem; }
  .event-cal { font-size: 0.72rem; color: var(--color-text-muted); margin-top: 0.1rem; }
  .error-msg { background: #fff0f0; color: var(--color-danger); border-radius: var(--radius-sm); padding: 0.6rem 0.85rem; font-size: 0.875rem; }
</style>
