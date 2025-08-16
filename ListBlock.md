# ListBlock

Overview:
ListBlock is a real-time Stacks system for updating financial sanctions and watchlists, helping banks instantly block illicit actors.

On-chain:
• Clarity contracts store sanction-list entries, automatic expiration, and multi-party update governance.

Off-chain:
• Python (Django) service for ingesting official lists (OFAC, EU, UN), diff analytics, and batched on-chain submissions.  
• Rust engine for high-speed diffing, cryptographic signing, and alert generation.

Front-end:
• Vue.js + Stacks.js console for compliance officers to review and approve updates.

Why this stack?
Clarity locks authoritative lists. Python accelerates data ingestion. Rust handles diff workloads and alerting.
