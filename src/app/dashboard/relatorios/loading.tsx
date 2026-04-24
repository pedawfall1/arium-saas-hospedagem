export default function Loading() {
  return (
    <div style={{ padding: '32px', width: '100%' }}>
      <div style={{ height: '28px', width: '200px', backgroundColor: 'var(--surface)', borderRadius: '8px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
      <div style={{ height: '16px', width: '140px', backgroundColor: 'var(--surface)', borderRadius: '6px', marginBottom: '24px', opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: '120px', backgroundColor: 'var(--surface)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
      <div style={{ height: '350px', backgroundColor: 'var(--surface)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
