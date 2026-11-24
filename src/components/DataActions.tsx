import Icon from './Icon'

export default function DataActions({
  onExport,
  onHistory,
}: {
  onExport: () => void
  onHistory: () => void
}) {
  return (
    <div className="data-actions">
      <button onClick={onExport}>
        <Icon name="download" size={16} />
        Export data
      </button>
      <button onClick={onHistory}>
        <Icon name="history" size={16} />
        Change history
      </button>
    </div>
  )
}
