# Budget certainty, payment edits, and change history

All `/api` routes below use the existing signed-in session and optional Cloudflare Access check. Actor identity comes from the authenticated server session, never the request body.

## Budget certainty

Existing category payloads remain compatible: `quote: 0` means **awaiting quote**. Positive quotes mean a price has been recorded. This release does not distinguish a confirmed free item from a missing quote. Existing zero values are preserved. Category money values must be finite, nonnegative numbers.

The UI separates known outstanding balances from unquoted items. Its working estimate is the sum, per item, of `max(quote, paid)` for quoted items and `max(budget, paid)` for unquoted items. Outstanding quoted balances are summed per item, so an overpayment on one item does not cancel another vendor's balance. Unknown balances and percentages appear as “Awaiting quote” and “Not available”. A comparison with the working estimate remains provisional until all quotes are recorded.

## Payment edits

`PATCH /api/payments/:id` accepts any nonempty subset of `category_id`, `date` (`YYYY-MM-DD`, a valid calendar date), `item`, `paid_by`, and `amount` (positive, finite, at most two decimals). Category IDs must exist; blank payer names are rejected. Existing payer names remain editable even when they are absent from the current people list. Empty descriptions become `Payment`.

Success: `200` with the updated payment, preserving its ID and creation time. Invalid input: `400`; missing payment: `404`. Creating payments uses the same validation. No-op edits do not add history entries.

## Change history

`GET /api/history?limit=50&before=123`

Returns `{ entries: ActivityEntry[], nextCursor: string | null }`. Limit is an integer from 1 to 100. `before` is an optional positive integer cursor; IDs are strings to preserve bigint precision. Entries are ordered by ID descending. The next cursor is exclusive. Invalid query values return `400`.

Each entry contains `id`, `entity_type` (`category`, `payment`, `person`), `entity_id`, `entity_label`, `action` (`created`, `updated`, `deleted`, `restored`), `actor_id`, `actor_name`, `before_data`, `after_data`, `restores_id`, and `created_at` (ISO timestamp). Snapshots contain the record's saved fields. Deleted category snapshots also contain `_payments` for undo; cascade-deleted payments receive their own history entries. Audit rows have no foreign key to live records, so deleting records preserves history.

Each API mutation and its history entries commit in one database transaction. Failures roll both back. History starts when this version is deployed; past changes are not reconstructed. Direct database changes and initial seed imports are outside the app audit trail. All signed-in app users can read it.

## Undo deletion

Category and payment DELETE responses return `{ ok: true, activity_id: string }`; missing records return `404`. The UI offers Undo briefly after a deletion.

`POST /api/history/:id/restore` restores a deleted payment, or a deleted category and its original payments, using its server-saved snapshot. Success: `200 { ok: true }`. Each restoration is logged and linked to the deletion it undoes, including every cascade-deleted payment when restoring a category. An undone deletion cannot be replayed after a later deletion of the same record. IDs are retained. Missing history: `404`; a non-deletion or unsupported type: `400`; an already restored record, duplicate ID, or missing parent category: `409`. Concurrent restore requests cannot duplicate a record. There is no API to edit or delete history.

## CSV exports

Budget and payment CSV files contain all currently loaded records, independent of list filters. History export fetches every history page using an exclusive ID cursor, so newer IDs do not shift subsequent pages. Files use UTF-8 with a BOM, CRLF rows, quoted fields, and escaped quotes. Spreadsheet formula prefixes in text fields are neutralized. Unknown quotes and balances are blank in budget CSV, with an explicit quote-status column. Numeric values retain cents. Exports run in the browser and inherit the existing API permissions.
