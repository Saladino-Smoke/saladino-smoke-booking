export async function onRequestPost({ request, env, waitUntil }) {
  const data = await request.json();

  const { firstName, lastName, email, phone, eventTypeLabel, eventDate,
          startTime, endTime, guestCount, venueName, eventAddress,
          notes, leadSource } = data;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #A74D4A; padding: 16px 20px;">
    <h2 style="color: #F5F5F5; margin: 0; font-size: 18px;">New Date Inquiry — Saladino Smoke</h2>
  </div>
  <div style="padding: 24px 20px; background: #F5F5F5; font-size: 14px; line-height: 1.8;">
    <p style="margin: 0 0 16px;"><strong>${firstName} ${lastName}</strong> submitted a date inquiry through the booking form.</p>
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <tr><td style="padding:4px 8px; font-weight:bold; width:140px;">Name</td><td style="padding:4px 8px;">${firstName} ${lastName}</td></tr>
      <tr style="background:#fff;"><td style="padding:4px 8px; font-weight:bold;">Email</td><td style="padding:4px 8px;"><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding:4px 8px; font-weight:bold;">Phone</td><td style="padding:4px 8px;"><a href="tel:${phone}">${phone}</a></td></tr>
      <tr style="background:#fff;"><td style="padding:4px 8px; font-weight:bold;">Event Type</td><td style="padding:4px 8px;">${eventTypeLabel}</td></tr>
      <tr><td style="padding:4px 8px; font-weight:bold;">Requested Date</td><td style="padding:4px 8px;"><strong>${eventDate}</strong></td></tr>
      <tr style="background:#fff;"><td style="padding:4px 8px; font-weight:bold;">Time</td><td style="padding:4px 8px;">${startTime}${endTime ? ' – ' + endTime : ''}</td></tr>
      <tr><td style="padding:4px 8px; font-weight:bold;">Guests</td><td style="padding:4px 8px;">${guestCount}</td></tr>
      <tr style="background:#fff;"><td style="padding:4px 8px; font-weight:bold;">Venue</td><td style="padding:4px 8px;">${venueName}</td></tr>
      <tr><td style="padding:4px 8px; font-weight:bold;">Address</td><td style="padding:4px 8px;">${eventAddress}</td></tr>
      ${notes ? `<tr style="background:#fff;"><td style="padding:4px 8px; font-weight:bold;">Notes</td><td style="padding:4px 8px;">${notes}</td></tr>` : ''}
      ${leadSource ? `<tr><td style="padding:4px 8px; font-weight:bold;">How they found us</td><td style="padding:4px 8px;">${leadSource}</td></tr>` : ''}
    </table>
    <p style="margin: 20px 0 0; font-size:13px; color:#555;">
      Reply to this email to reach ${firstName} at <a href="mailto:${email}">${email}</a>.
    </p>
  </div>
</div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Saladino Smoke Catering <info@saladinocatering.com>',
      to: ['catering@saladinosmoke.com'],
      reply_to: email,
      subject: `Date Inquiry: ${firstName} ${lastName} — ${eventTypeLabel} on ${eventDate}`,
      html
    })
  });

  // Every inquiry also becomes a New inquiry card on the HQ Catering board.
  // With the relay key, HQ saves it without emailing catering@ again (this
  // email is the one). If this email failed, HQ gets it without the key, so
  // HQ sends catering@ its own copy instead. Runs after the reply, so a slow
  // or failed HQ never holds up or fails the customer.
  if (env.INQUIRE_RELAY_KEY) {
    const headers = { 'Content-Type': 'application/json' };
    if (res.ok) headers['X-Relay-Key'] = env.INQUIRE_RELAY_KEY;
    waitUntil(
      fetch(env.HQ_INQUIRE_URL || 'https://hq.saladinocatering.com/api/inquire', {
        method: 'POST', headers, body: JSON.stringify(data),
      }).then((r) => { if (!r.ok) console.log('HQ relay answered', r.status); })
        .catch((e) => console.log('HQ relay failed', e.message))
    );
  }

  const status = res.ok ? 200 : 502;
  return new Response(JSON.stringify({ success: res.ok }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
