const HOURS = Array.from({ length: 11 }, (_, i) => i + 9)

export default function LunchesView({ selectedDateLunches, selectedLunchUser, createLunch, deleteLunch }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
      <h3 className="text-lg font-semibold text-white mb-4">График обед</h3>
      <div className="w-full max-w-2xl space-y-1.5">
        {HOURS.map(hour => {
          const slotLunches = selectedDateLunches.filter(l => l.lunch_hour === hour)
          return (
            <div
              key={hour}
              className="flex items-center rounded-lg px-4 py-3"
              style={{
                background: '#17212b',
                borderLeft: slotLunches.length > 0 ? '3px solid #3390ec' : '3px solid transparent'
              }}
            >
              <span className="text-sm font-mono w-14 text-center" style={{ color: '#7b8fa3' }}>
                {hour}:00
              </span>
              <div className="flex-1 flex flex-wrap gap-1.5 ml-3">
                {slotLunches.map(l => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                    style={{ background: '#242f3d', color: '#a8b9cc' }}
                  >
                    {l.display_name || l.username}
                    <button
                      onClick={() => deleteLunch(l.id)}
                      className="ml-0.5 hover:text-red-400"
                      style={{ color: '#7b8fa3' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {selectedLunchUser && !slotLunches.some(l => l.user_id === selectedLunchUser) && (
                <button
                  onClick={() => createLunch(hour)}
                  className="ml-2 px-2 py-1 rounded text-xs"
                  style={{ background: '#3390ec', color: '#fff' }}
                >
                  +
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
