export default function FormattedText({ text }) {
  if (!text) return null

  const lines = text.split('\n')

  return (
    <span className="card-text">
      {lines.map((line, i) => (
        <span key={i}>
          {line.split(/(\*\*.*?\*\*|__.*?__|_.*?_|~~.*?~~)/g).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <span key={j} className="bold">{part.slice(2, -2)}</span>
            }
            if (part.startsWith('__') && part.endsWith('__')) {
              return <span key={j} className="underline">{part.slice(2, -2)}</span>
            }
            if (part.startsWith('_') && part.endsWith('_')) {
              return <span key={j} className="italic">{part.slice(1, -1)}</span>
            }
            if (part.startsWith('~~') && part.endsWith('~~')) {
              return <span key={j} style={{ textDecoration: 'line-through' }}>{part.slice(2, -2)}</span>
            }
            return <span key={j}>{part}</span>
          })}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </span>
  )
}
