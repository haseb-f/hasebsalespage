# GTM Container Setup — Haseb Sales Page

`index.html` now loads GTM (`GTM-KTHZSFNL`) and pushes structured events to
`window.dataLayer` via the `window.HasebDL` utility (see the `<head>` of
`index.html`). GA4, Meta Pixel, and TikTok Pixel are **not** hardcoded on the
page — they must be configured as Tags inside the GTM container itself
(gtm.google.com), triggered off the dataLayer events below. This doc is the
exact spec for that container config.

IDs in scope:
- GTM Container: `GTM-KTHZSFNL`
- GA4 Measurement ID: `G-DCP0ZNJH7F`
- Meta Pixel ID: `1682579589461028`
- TikTok Pixel ID: `D9GD5BBC77UA9BUUDVOG`

## Business logic note

This page has **no on-site form**. The only conversion actions are a
WhatsApp click and a phone click. Per product decision, **only the WhatsApp
click counts as a completed lead** — every `[data-cta="whatsapp"]` click
fires `whatsapp_click` **and** `lead_generated` together (see
`index.html`'s click handler). Phone clicks fire `phone_click` only, no
lead conversion. If you later want phone clicks to also count as leads,
add `window.HasebDL.leadGenerated(...)` to that branch of the click handler.

## 1. Variables to create (Variables → New → Data Layer Variable)

| Variable name        | Data Layer Variable Name |
|-----------------------|---------------------------|
| DLV - cta_label       | `cta_label`               |
| DLV - cta_location    | `cta_location`            |
| DLV - lead_method     | `lead_method`              |
| DLV - percent         | `percent`                  |
| DLV - seconds         | `seconds`                  |
| DLV - button_type     | `button_type`              |
| DLV - email           | `email`                    |
| DLV - file_url        | `file_url`                 |
| DLV - file_name       | `file_name`                |

Also create two Constant variables:
- `Const - Meta Pixel ID` = `1682579589461028`
- `Const - TikTok Pixel ID` = `D9GD5BBC77UA9BUUDVOG`

## 2. Triggers to create (Triggers → New → Custom Event)

| Trigger name              | Event name       |
|----------------------------|-------------------|
| CE - page_view              | `page_view`        |
| CE - button_click           | `button_click`      |
| CE - whatsapp_click         | `whatsapp_click`    |
| CE - phone_click            | `phone_click`       |
| CE - email_click            | `email_click`       |
| CE - lead_generated         | `lead_generated`    |
| CE - scroll_depth           | `scroll_depth`      |
| CE - time_on_page           | `time_on_page`      |
| CE - download               | `download`          |

(`form_submit` has no matching trigger yet since there's no form on the
page — the event name is reserved in `HasebDL.formSubmit()` for if/when one
is added.)

## 3. Tags to create

### GA4

**GA4 Configuration** (Tag Type: *Google Analytics: GA4 Configuration*)
- Measurement ID: `G-DCP0ZNJH7F`
- Trigger: **Initialization – All Pages** (built-in)
- Leave "Send a page view event when this configuration loads" **ON**.
- ⚠️ Do NOT also create a GA4 event tag on the custom `page_view` dataLayer
  event — that would double-fire pageviews. The custom `page_view` push
  exists for Meta/TikTok base-code triggering only (see below), GA4 gets
  its pageview from this Configuration tag alone.

**GA4 Event tags** (Tag Type: *Google Analytics: GA4 Event*, all reference
the GA4 Configuration tag above):

| Tag name              | GA4 Event Name    | Event Parameters                         | Trigger              |
|------------------------|--------------------|-------------------------------------------|------------------------|
| GA4 - whatsapp_click    | `whatsapp_click`    | cta_label, cta_location                    | CE - whatsapp_click     |
| GA4 - phone_click       | `phone_click`       | cta_label, cta_location                    | CE - phone_click        |
| GA4 - email_click       | `email_click`       | cta_label, cta_location, email             | CE - email_click        |
| GA4 - lead_generated    | `generate_lead`     | lead_method, cta_label, cta_location       | CE - lead_generated     |
| GA4 - scroll_depth      | `scroll`            | percent                                    | CE - scroll_depth       |
| GA4 - time_on_page      | `time_on_page`      | seconds                                    | CE - time_on_page       |
| GA4 - button_click      | `button_click`      | button_type, cta_label, cta_location       | CE - button_click       |
| GA4 - download          | `file_download`     | file_url, file_name                        | CE - download           |

(`generate_lead` and `file_download` are GA4's recommended event names for
these actions — everything else keeps our own custom event name.)

### Meta Pixel

**Meta Pixel - Base Code** (Tag Type: *Custom HTML*)
```html
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{{Const - Meta Pixel ID}}');
fbq('track', 'PageView');
</script>
```
- Trigger: **Initialization – All Pages** (built-in)
- Tag firing priority: high (fires early, before event tags below)

**Meta - ViewContent** (Custom HTML, fires once per session as an
engagement signal)
```html
<script>fbq('track', 'ViewContent');</script>
```
- Trigger: **CE - scroll_depth**, add a trigger condition `percent equals 25`
  (fires the first time a visitor scrolls a quarter of the page)
- Tag Sequencing: "Fire a tag before this tag fires" → Meta Pixel - Base Code

**Meta - Contact** (Custom HTML)
```html
<script>fbq('track', 'Contact');</script>
```
- Trigger: this tag needs an **Or** trigger group firing on both
  **CE - whatsapp_click** and **CE - phone_click**
- Tag Sequencing: fire Meta Pixel - Base Code first

**Meta - Lead** (Custom HTML)
```html
<script>fbq('track', 'Lead');</script>
```
- Trigger: **CE - lead_generated**
- Tag Sequencing: fire Meta Pixel - Base Code first

**Meta - CompleteRegistration** (Custom HTML)
```html
<script>fbq('track', 'CompleteRegistration');</script>
```
- Trigger: **CE - lead_generated** (same trigger as Lead — both standard
  events fire together off the one real conversion moment, so campaigns
  optimizing for either objective have data)
- Tag Sequencing: fire Meta Pixel - Base Code first

### TikTok Pixel

**TikTok Pixel - Base Code** (Custom HTML)
```html
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=i+"?sdkid="+e+"&lib="+t;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};
  ttq.load('{{Const - TikTok Pixel ID}}');
  ttq.page();
}(window, document, 'ttq');
</script>
```
- Trigger: **Initialization – All Pages**
- Tag firing priority: high

**TikTok - ViewContent**
```html
<script>ttq.track('ViewContent');</script>
```
- Trigger: **CE - scroll_depth**, condition `percent equals 25`
- Sequencing: fire TikTok Pixel - Base Code first

**TikTok - Contact**
```html
<script>ttq.track('Contact');</script>
```
- Trigger: Or group of **CE - whatsapp_click** / **CE - phone_click**
- Sequencing: fire TikTok Pixel - Base Code first

**TikTok - SubmitForm**
```html
<script>ttq.track('SubmitForm');</script>
```
- Trigger: **CE - lead_generated**
- Sequencing: fire TikTok Pixel - Base Code first

**TikTok - CompleteRegistration**
```html
<script>ttq.track('CompleteRegistration');</script>
```
- Trigger: **CE - lead_generated**
- Sequencing: fire TikTok Pixel - Base Code first

## 4. Duplicate-prevention checklist

- Only ONE tag sends a GA4 pageview: the GA4 Configuration tag on
  Initialization. No GA4 event tag listens for `page_view`.
- Only ONE tag sends `fbq('track','PageView')` / `ttq.page()`: the two base
  code tags, both on Initialization. No event tag repeats PageView.
- `whatsapp_click` fires `lead_generated` exactly once per click (pushed
  once, synchronously, from the single delegated click handler in
  `index.html` — not from multiple listeners).
- `scroll_depth` and `time_on_page` each fire at most once per threshold
  per page load (guarded by a `fired` map / one-shot `setTimeout`s in the
  page script), so re-scrolling past 25% twice won't double-count.

## 5. QA / verification steps

1. **GTM loads**: open the page, DevTools → Network → filter `gtm.js` →
   confirm a 200 response for `googletagmanager.com/gtm.js?id=GTM-KTHZSFNL`.
2. **dataLayer exists**: Console → `window.dataLayer` → should be an array
   already containing a `gtm.js` entry and a `page_view` entry.
3. **Click tracking**: click a WhatsApp CTA → `window.dataLayer` should
   gain `button_click`, `whatsapp_click`, and `lead_generated` entries (in
   that order) before the new tab opens.
4. **GTM Preview mode**: Tags → Preview → connect to the page → confirm the
   GA4 Configuration, Meta base, and TikTok base tags fire on page load,
   and each event tag fires on its matching click/scroll/time trigger.
5. **Meta Pixel Helper** (Chrome extension) → confirm PageView fires
   immediately, and Contact/Lead/CompleteRegistration fire on WhatsApp
   click with no errors.
6. **TikTok Pixel Helper** (Chrome extension) → same check for
   PageView/Contact/SubmitForm/CompleteRegistration.
7. **GA4 DebugView** (Admin → DebugView, with the page in GTM Preview mode
   or `?gtm_debug=1`) → confirm `page_view`, `whatsapp_click`,
   `generate_lead` etc. arrive with the right parameters.
8. Reload the page and confirm `page_view` fires exactly once (check
   Network tab for a single `google-analytics.com/g/collect?...&en=page_view`
   request) — no duplicates from a second source.
