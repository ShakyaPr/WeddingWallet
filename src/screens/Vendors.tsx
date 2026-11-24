import { useState } from 'react'
import type { ScreenProps } from '../viewtypes'
import { EmptyState, ScreenHeading, SearchField } from '../components/ui'
import Icon, { categoryIcon } from '../components/Icon'

export default function Vendors({ d }: ScreenProps) {
  const [search, setSearch] = useState('')
  const vendors = d.vendors.filter((v) =>
    `${v.name} ${v.item} ${v.contact}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="screen">
      <ScreenHeading
        eyebrow="THE PEOPLE BEHIND THE MAGIC"
        title="Your dream team"
        description="All your vendors, just a little closer."
      />
      <SearchField value={search} onChange={setSearch} placeholder="Search vendors or services" />
      <div className="section-heading">
        <h2>Your vendors</h2>
        <span className="count-label">
          {vendors.length} {vendors.length === 1 ? 'service' : 'services'}
        </span>
      </div>
      {vendors.map((v) => (
        <section className="vendor-card" key={v.name + v.item}>
          <div className="vendor-heading">
            <span className="vendor-avatar" style={{ background: v.tint, color: 'var(--wine)' }}>
              {v.initial}
            </span>
            <div>
              <h2>{v.name}</h2>
              <p>
                <Icon name={categoryIcon(v.item)} size={13} />
                {v.item}
              </p>
            </div>
          </div>
          {v.hasContact && <p className="vendor-contact">{v.contact}</p>}
          <div className="vendor-money">
            <div>
              <span>Quoted</span>
              <strong>{v.quoteFmt}</strong>
            </div>
            <div>
              <span>Paid</span>
              <strong className="positive">{v.paidFmt}</strong>
            </div>
            <div>
              <span>Balance</span>
              <strong className="wine">{v.balanceFmt}</strong>
            </div>
          </div>
          {v.hasPhone ? (
            <div className="vendor-actions">
              <a className="small-primary" href={`tel:${v.phone}`}>
                <Icon name="phone" size={16} />
                Call vendor
              </a>
              <a className="secondary-button" href={`sms:${v.phone}`}>
                <Icon name="message" size={16} />
                Message
              </a>
            </div>
          ) : (
            <p className="contact-note">
              {v.hasContact
                ? 'Contact details saved above'
                : 'Add contact details in the budget item'}
            </p>
          )}
        </section>
      ))}
      {!vendors.length && (
        <EmptyState
          icon="vendors"
          title={search ? 'No vendors found' : 'Your dream team starts here'}
          description={
            search
              ? 'Try a different name or service.'
              : 'Add a vendor to a budget item and their details will appear here.'
          }
        />
      )}
    </div>
  )
}
