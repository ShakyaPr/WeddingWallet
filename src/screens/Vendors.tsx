import type { ScreenProps } from '../viewtypes'
import { screenTitle } from '../components/ui'

const statLabel = { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, color: '#B49398', letterSpacing: 0.5 }

export default function Vendors({ d }: ScreenProps) {
  return (
    <div style={{ animation: 'wbFade .3s ease' }}>
      <div style={{ ...screenTitle, marginBottom: 14 }}>Vendors</div>

      {d.vendors.map((v) => (
        <div key={v.name + v.item} style={{ background: '#fff', border: '1px solid #F1E7E4', borderRadius: 20, padding: 17, marginBottom: 12, boxShadow: '0 8px 20px rgba(58,44,46,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
            <div style={{ flex: '0 0 auto', width: 46, height: 46, borderRadius: '50%', background: v.tint, color: v.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 600 }}>
              {v.initial}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{v.name}</div>
              <div style={{ fontSize: 12, color: '#9A868A', marginTop: 1 }}>{v.item}</div>
              {v.hasContact && <div style={{ fontSize: 12.5, color: '#8B6169', marginTop: 7, fontWeight: 600, letterSpacing: 0.2 }}>{v.contact}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 13, borderTop: '1px solid #F5EEEB' }}>
            <div>
              <div style={statLabel}>Quoted</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>{v.quoteFmt}</div>
            </div>
            <div>
              <div style={statLabel}>Paid</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3, color: '#5E7A58' }}>{v.paidFmt}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={statLabel}>Balance</div>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 3, color: '#A05C6A' }}>{v.balanceFmt}</div>
            </div>
          </div>

          {v.hasPhone && (
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              <a href={'tel:' + v.phone} style={{ flex: 1, textAlign: 'center', background: '#7E4451', color: '#fff', fontSize: 12.5, fontWeight: 700, padding: 10, borderRadius: 13 }}>Call</a>
              <a href={'sms:' + v.phone} style={{ flex: 1, textAlign: 'center', background: '#F3E7E4', color: '#7E4451', fontSize: 12.5, fontWeight: 700, padding: 10, borderRadius: 13 }}>Message</a>
            </div>
          )}
        </div>
      ))}

      {d.vendors.length === 0 && <div style={{ fontSize: 13, color: '#9A868A', padding: '10px 2px' }}>No vendors yet. Add a budget item with a vendor name.</div>}
    </div>
  )
}
