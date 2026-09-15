interface ServiceCardProps {
  id: string
  name: string
  icon: string
  color: string
  columnSpan: number
}

function ServiceCard({ id, name, icon, color, columnSpan }: ServiceCardProps) {
  const handleClick = () => {
    // Navigate to service or show coming soon
    if (id === 'data') {
      window.location.href = '/dashboard'
    } else {
      alert(`${name} service coming soon!`)
    }
  }

  return (
    <div
      className={`col-span-${columnSpan} flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${color} rounded shadow-lg cursor-pointer hover:scale-105 transition transform`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick()
        }
      }}
    >
      <span className="text-3xl">{icon}</span>
      <span className="font-semibold text-white uppercase tracking-wider text-sm">{name}</span>
    </div>
  )
}

export default ServiceCard
