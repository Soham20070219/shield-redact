export const SAMPLE_NOISY_DATA = `=== SUPPORT TICKET #INC-40928 ===
Reported By: Priya Sharma <priya.sharma@finvault.in>
Backup Contact: PRIYA.SHARMA@FINVAULT.IN | alt: dev.ops+alerts@cloudscale.io
Mobile (Primary): +91 98765 43210
Mobile (Callback): +91-9876543210 | US Escalation: +1 (415) 555-0192
Billing PAN: ABCDE1234F | Co-Applicant PAN: KLMNP5678Q
KYC Aadhaar (Spaced): 4829 7310 6452
KYC Aadhaar (Unspaced): 739184620519
Card on File (Visa Test): 4532-0155-8291-0367
Corporate Card (MC Test): 5425 2334 3010 9903
Merchant Order Ref (16-digit non-Luhn decoy): 4532-0155-8291-0365
Warehouse Batch ID (16-digit non-Luhn decoy): 2345678901234561

=== CLINICAL INTAKE NOTE (SYNTHETIC) ===
Patient Email: arjun.mehta@medicare-demo.org
Emergency Contact: 9811223344 (Spouse: +91 98765 43210)
Insurance Subscriber Note: Verify coverage for PAN ABCDE1234F before discharge.
Telehealth Session Endpoint: 172.16.254.12 (Fallback IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334)

=== AUTH GATEWAY SERVER LOG ===
[2026-11-27T09:41:12Z] INFO  auth-svc v2.1.4.0 started on node 10.24.18.92
[2026-11-27T09:42:05Z] WARN  Failed token refresh for priya.sharma@finvault.in from 192.168.14.88
[2026-11-27T09:42:19Z] ERROR Malformed header X-Forwarded-For: 999.999.999.999 (ignored by gateway)
[2026-11-27T09:43:01Z] INFO  Payment webhook verified for card 4532-0155-8291-0367 (order=4532015582910365)
[2026-11-27T09:43:44Z] INFO  IPv6 healthcheck OK from fe80::1ff:fe23:4567:890a (build v2.1.4.0)`;
