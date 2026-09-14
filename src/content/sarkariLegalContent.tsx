import type { ReactNode } from "react";
import { SITE_CONFIG } from "@/lib/constant";
import { openCookieSettings } from "@/lib/promptSequence";
import type { SarkariLegalSlug } from "@/lib/sarkariLegal";

function ContactBlock() {
  return (
    <address className="not-italic">
      <strong>DekhoCampus Private Limited</strong><br />
      CIN: U80902DL2021PTC381778<br />
      Registered office: RZ 43, Suden Garden, Najafgarh, New Delhi - 110043, India<br />
      Grievance Officer: Chetan Garg<br />
      Email: <a href={`mailto:${SITE_CONFIG.supportEmail}`}>{SITE_CONFIG.supportEmail}</a><br />
      Phone: <a href={`tel:${SITE_CONFIG.supportPhone}`}>{SITE_CONFIG.supportPhoneDisplay}</a>
    </address>
  );
}

function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="inline-flex min-h-11 items-center rounded-md border border-primary px-4 py-2 font-semibold text-primary"
    >
      Open cookie settings
    </button>
  );
}

const privacyPolicy = (
  <>
    <h2>1. Scope and who this notice covers</h2>
    <p>
      This Privacy Policy applies to the Sarkari DekhoCampus website, its government job and examination
      information pages, saved-item features, update request forms and related communications. In this policy,
      "DekhoCampus", "we", "us" and "our" refer to DekhoCampus Private Limited, CIN U80902DL2021PTC381778,
      the operator of this service. It does not govern a recruiting authority, government portal, advertiser or
      other website that you visit through a link from us.
    </p>
    <p>
      This is a privacy notice. It does not require you to agree to unrelated marketing, and it does not reduce any
      right available to you under applicable law.
    </p>

    <h2>2. Information we collect</h2>
    <h3>Information you provide</h3>
    <ul>
      <li>Your name, email address and mobile number.</li>
      <li>Your target examination, job or subject of interest, state, city and communication preferences.</li>
      <li>Whether an OTP was requested or verified, and technical records needed to prevent misuse. We do not ask you to send an OTP to our support team.</li>
      <li>Your messages, correction requests, complaints and records showing the notice and consent choice presented when you submitted a form.</li>
    </ul>
    <p>
      The Sarkari service is not a government application portal. Do not send us Aadhaar numbers, passwords for a
      government account, bank or card details, caste or disability certificates, medical records, application-fee
      payment data or other application documents. If an official application requires such information, submit it
      only through the recruiting authority's verified website.
    </p>

    <h3>Information generated when you use the service</h3>
    <ul>
      <li>Pages and links viewed, searches, referral and campaign parameters, dates and times, and interaction events such as clicks, scroll depth and form completion events.</li>
      <li>Browser, operating system, device type, screen or viewport details, language, time zone, approximate location derived from network information, IP address in transit, and diagnostic or security information.</li>
      <li>Random browser, session and consent identifiers, consent-category choices, saved job/article identifiers and duplicate-prevention records.</li>
      <li>Advertising slot-request records from our page, plus delivery, impression and click information measured by the advertising provider where advertising is enabled.</li>
    </ul>

    <h3>Cookies and browser storage</h3>
    <p>
      We use cookies and similar technologies such as local storage. These may remember your consent choice, keep a
      requested feature working, save selected articles, prefill a form when you choose that option, measure use or
      support advertising. Optional analytics, personalisation and marketing technologies are described in our
      <a href="/legal/cookie-policy"> Cookie Policy</a>.
    </p>

    <h2>3. Why we use information</h2>
    <p>We use information only for identified and reasonably related purposes, including to:</p>
    <ul>
      <li>provide search, saved items, job and examination updates, and the guidance or alert you request;</li>
      <li>verify a mobile number, prevent duplicate or fraudulent submissions, secure the service and investigate abuse;</li>
      <li>respond to enquiries, correction requests, privacy requests and complaints;</li>
      <li>remember information on your device when you enable form prefill or another optional preference;</li>
      <li>understand and improve page performance and usability when analytics is enabled;</li>
      <li>display and measure advertising when marketing or advertising technologies are enabled; and</li>
      <li>keep records, enforce our terms and comply with a valid legal obligation.</li>
    </ul>
    <p>
      We do not use a general government-job update request as permission for a materially different purpose. If we
      want to connect you with a separately identified education, coaching, recruitment, finance or other partner,
      the form must describe that purpose and recipient category before you choose whether to proceed.
    </p>

    <h2>4. Calls, SMS, WhatsApp and email</h2>
    <p>
      When a form states that you may be contacted by call, SMS, WhatsApp or email and you affirmatively submit it,
      we may use the listed channels for the update or guidance described on that form. We may use communication
      providers to deliver those messages on our behalf. You can withdraw a communication choice by using an
      unsubscribe or stop facility where provided, telling the caller, or contacting us. Withdrawal does not affect
      processing already lawfully completed and may not stop a service message that is strictly necessary to complete
      a request you already made.
    </p>

    <h2>5. When information is disclosed</h2>
    <p>We may disclose information, limited to what is reasonably necessary, to:</p>
    <ul>
      <li>hosting, database, content-delivery, security, OTP, messaging, email, support and other vendors working for us under appropriate restrictions;</li>
      <li>analytics and advertising providers when the relevant choice is enabled, as described in the Cookie Policy;</li>
      <li>a partner you specifically ask us to connect you with after the purpose and partner category are disclosed;</li>
      <li>professional advisers, insurers or a successor in a genuine restructuring, subject to confidentiality and applicable law; or</li>
      <li>a court, regulator, law-enforcement agency or other person when disclosure is required by law or reasonably necessary to protect users, the service or legal rights.</li>
    </ul>
    <p>
      An advertiser does not receive your name, email address or phone number merely because its advertisement appears
      on a page. Advertising providers may receive device, cookie and interaction information as separately described.
    </p>

    <h2>6. Retention</h2>
    <p>
      We retain personal information only while it is reasonably needed for the purpose described at collection, an
      active request or communication choice, security and duplicate prevention, a required record, the establishment
      or defence of legal claims, or another applicable legal obligation. We then delete it, anonymise it or place it
      beyond ordinary use. The period therefore depends on the type of record, why it was collected, whether you still
      use the feature, and the legal or security period that applies. Backup copies are removed through the applicable
      backup cycle. Data kept by an independent third-party service is subject to that provider's settings and policy.
    </p>
    <p>
      Browser-local records remain on your device until the feature removes them, you change the relevant setting, or
      you clear site data in your browser.
    </p>

    <h2>7. Security</h2>
    <p>
      We use reasonable administrative, technical and organisational safeguards appropriate to the nature of the
      information, including access restrictions, secure transmission, logging, monitoring, backups and vendor
      controls where appropriate. No internet service can promise absolute security. Please do not send sensitive
      documents or credentials through a general contact form. If you believe data or an account is at risk, contact
      the Privacy & Grievance Desk promptly.
    </p>

    <h2>8. Processing outside India</h2>
    <p>
      Some hosting, analytics, advertising or communications providers may process information in more than one
      country. Where applicable law places conditions on such processing or transfer, we will apply the required
      assessment, contractual protection or restriction. Provider locations may change as their infrastructure changes.
    </p>

    <h2>9. Your choices and requests</h2>
    <p>Subject to applicable law and necessary identity checks, you may ask us to:</p>
    <ul>
      <li>confirm whether we hold personal information about you and provide information about its processing;</li>
      <li>correct or update inaccurate or incomplete information;</li>
      <li>erase information that is no longer required, unless lawful retention applies;</li>
      <li>withdraw consent or stop optional communications; and</li>
      <li>review a privacy grievance and explain our decision.</li>
    </ul>
    <p>
      Send the mobile number or email used for the request, the right you want to exercise and enough detail to locate
      the record. Do not send an OTP, password or identity document unless we provide a secure, necessary verification
      method. We may refuse or limit a request only where permitted by law and will explain the applicable reason.
    </p>
    <p><CookieSettingsButton /></p>

    <h2>10. Children</h2>
    <p>
      Public job information may be browsed by families, but contact and alert forms are intended only for people aged
      18 or older. A person under 18 must not submit personal information through those forms. We do not knowingly seek a
      child's contact information or knowingly use a child's data for behavioural monitoring or targeted advertising.
      If you believe a child has submitted information, ask us to review and remove or restrict it as required by law.
    </p>

    <h2>11. External websites</h2>
    <p>
      Recruiting authorities, government portals and other linked sites decide their own privacy and security
      practices. Review the address bar, the linked site's privacy notice and the official notification before entering
      personal data or paying a fee. Our linking to a page does not make us its operator.
    </p>

    <h2>12. Changes to this policy</h2>
    <p>
      We may update this policy when the service, vendors or law changes. The date shown on the page identifies the
      current version. A material change will be presented through a reasonable notice and, where required, a fresh
      choice before the changed processing begins.
    </p>

    <h2>13. Privacy and grievance contact</h2>
    <p>
      Please include the relevant page or form URL, the contact detail used and a clear description of the issue. We
      will acknowledge and address requests within the period required by applicable law. Where a statutory escalation
      route applies, our response will not prevent you from using it.
    </p>
    <ContactBlock />
  </>
);

const cookiePolicy = (
  <>
    <h2>1. What this policy explains</h2>
    <p>
      This policy explains how Sarkari DekhoCampus uses cookies and similar browser technologies. A cookie is a small
      record a website or its provider asks a browser to store. Local storage and comparable technologies can keep
      information on a device without using a traditional cookie. We refer to all of them as "technologies" below.
    </p>

    <h2>2. Your control</h2>
    <p>
      Essential technologies support a feature you request, security and the record of your privacy choice. Optional
      personalisation, analytics and marketing technologies remain controlled by the categories shown in Cookie
      Settings. Leaving an optional category off must not prevent ordinary access to public job information.
    </p>
    <p>
      You can change your choice at any time. The new choice applies going forward. It cannot undo processing already
      completed, and you may also need to clear existing cookies through your browser or use a provider's opt-out tool.
    </p>
    <p><CookieSettingsButton /></p>

    <h2>3. Technology categories</h2>
    <div className="table-wrap" role="region" aria-label="Cookie and browser storage categories" tabIndex={0}>
      <table>
        <thead>
          <tr><th>Category</th><th>Examples</th><th>Purpose</th><th>Control</th></tr>
        </thead>
        <tbody>
          <tr>
            <th>Essential</th>
            <td><code>dc_cookie_consent_v1</code>, <code>dc_cookie_prefs_v1</code>, session, OTP security and duplicate-prevention records</td>
            <td>Remember your choice, keep requested features working, protect forms and prevent abuse.</td>
            <td>Always active where reasonably necessary. Blocking these in your browser may break a requested feature.</td>
          </tr>
          <tr>
            <th>Personalisation</th>
            <td><code>dc_user_prefill_v1</code> and browser-saved preferences</td>
            <td>Remember details on your device so a later form can be prefilled. Saved-article identifiers may also remain locally when you ask to save an item.</td>
            <td>Off unless enabled, except storage strictly needed for a saved feature you directly request.</td>
          </tr>
          <tr>
            <th>Analytics</th>
            <td>First-party measurement identifiers, Google Analytics and Microsoft Clarity technologies</td>
            <td>Measure visits and interactions, diagnose errors, understand performance and improve layouts.</td>
            <td>Off unless enabled in Cookie Settings.</td>
          </tr>
          <tr>
            <th>Marketing and advertising</th>
            <td>Google advertising and Meta Pixel technologies</td>
            <td>Deliver, limit, personalise where allowed, and measure advertisements or conversions.</td>
            <td>Off unless enabled in Cookie Settings.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>
      Cookie names can change when a provider updates its service. Your browser's storage inspector shows the records
      actually present for your visit. Provider-set lifetimes are controlled by their published policies and our
      available account settings.
    </p>

    <h2>4. Analytics services</h2>
    <h3>Google Analytics</h3>
    <p>
      When Analytics is enabled, Google Analytics may receive page and session activity, an approximate location,
      browser and device information, and a random client identifier. We must not send names, email addresses, phone
      numbers or other directly identifying form values to Google Analytics. Learn how Google handles data in its
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"> Privacy Policy</a> and
      <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer"> partner-sites explanation</a>.
    </p>

    <h3>Microsoft Clarity</h3>
    <p>
      When Analytics is enabled, Microsoft Clarity may collect clicks, scrolling, pointer movement, window changes,
      selections, page and performance events, and page structure needed for heatmaps and session replay. Form inputs
      and other designated areas are configured for masking; we do not intentionally send the value typed into a lead
      form for replay. Microsoft explains its practices in the
      <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer"> Microsoft Privacy Statement</a>.
    </p>

    <h2>5. Advertising services</h2>
    <h3>Google advertising</h3>
    <p>
      When Marketing and advertising is enabled, Google and participating advertising vendors may use cookies or
      identifiers to serve and measure ads based on this visit and, where permitted, prior visits to this or other
      websites. You can manage personalised advertising in
      <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer"> Google Ads Settings</a>.
      An ad is a third party's message and does not become a government notice or a DekhoCampus recommendation merely
      because it appears on this site.
    </p>

    <h3>Meta Pixel</h3>
    <p>
      When Marketing and advertising is enabled, the Meta Pixel may receive device and browser information, the page
      visited, cookie or event identifiers and selected conversion events. We must not send raw form values such as
      your name, email address or phone number in a Pixel event. See the
      <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer"> Meta Privacy Policy</a>.
    </p>

    <h3>Other configurable measurement services</h3>
    <p>
      Depending on the integrations enabled for this site, analytics may also be provided by Hotjar or Plausible, and
      marketing measurement may also use Microsoft Advertising UET or the LinkedIn Insight Tag. Listing an integration
      here does not mean it ran during your visit. These services are loaded only when configured and when the relevant
      optional category is enabled. Their technologies and processing are governed by the provider's privacy terms.
    </p>

    <h2>6. Tag management and site verification</h2>
    <p>
      Google Tag Manager may be used to load only the tags allowed by the relevant setting. A Search Console
      verification meta tag simply proves control of the website and is not an analytics cookie. Any newly added tag
      must be classified, documented and placed behind the appropriate choice before release.
    </p>

    <h2>7. Browser controls and contact</h2>
    <p>
      Most browsers let you block or delete cookies and site data. Doing so can remove saved preferences or require you
      to make a new consent choice. For questions about our technology inventory or a choice that is not working,
      contact:
    </p>
    <ContactBlock />
  </>
);

const termsOfService = (
  <>
    <h2>1. Agreement and scope</h2>
    <p>
      These Terms of Use apply to Sarkari DekhoCampus, operated by DekhoCampus Private Limited, CIN
      U80902DL2021PTC381778, and its public information, search, saved-item, update request and related features. By
      using the service, you agree to these terms to the extent a binding agreement may lawfully be formed. If you do
      not agree, do not submit a form or continue using an optional feature.
    </p>
    <p>
      Public information may be read without creating an account. Contact and alert forms are intended for people aged
      18 or older. If you are under the age of majority, a parent or lawful guardian should review your use and you must
      not submit personal information through those forms. Nothing here treats a minor as competent to enter a
      contract where law provides otherwise.
    </p>

    <h2>2. Nature of the service</h2>
    <p>
      Sarkari DekhoCampus is an independent information service. We summarise and organise government job, result,
      admit-card, answer-key, admission, syllabus and scholarship updates and may link to the relevant authority. We
      are not a ministry, department, commission, board, public authority, recruiting body or government agent, and no
      such body has authorised us to accept an application, issue an admit card or result, decide eligibility, collect
      an official fee, select a candidate or offer employment.
    </p>

    <h2>3. Official information controls</h2>
    <p>
      Our pages are concise summaries and may contain a delay, omission or error. A recruiting authority may amend,
      postpone, cancel or withdraw a notice without advance notice to us. The authority's current notification,
      corrigendum and application portal always control. Before acting, you must independently verify the post,
      vacancies, category and reservation rules, age calculation, qualifications, experience, documents, fee and
      exemptions, dates, time, location, selection process and exact official web address.
    </p>

    <h2>4. Applications, payments and outcomes</h2>
    <p>
      Unless a page expressly and lawfully says otherwise, Sarkari DekhoCampus does not receive a government job
      application or application fee. An "Apply" or "Official website" link may take you to a third-party portal whose
      own terms and privacy policy apply. We do not guarantee that you are eligible, that an application will be
      accepted, that an examination or recruitment will occur, or that you will be shortlisted, selected or appointed.
      Never pay anyone who claims that a payment to DekhoCampus can secure a government job or result.
    </p>

    <h2>5. Your responsibilities</h2>
    <p>You agree not to:</p>
    <ul>
      <li>misrepresent your identity, submit another person's contact details without authority or misuse OTP facilities;</li>
      <li>attempt unauthorised access, introduce malicious code, overload the service or bypass a security or rate limit;</li>
      <li>use the service for fraud, impersonation, unlawful discrimination, harassment or any other unlawful purpose;</li>
      <li>copy or republish a substantial part of our original compilation, design or database without permission;</li>
      <li>remove notices, create a misleading government affiliation or frame the service in a way that confuses users; or</li>
      <li>use an automated process in a manner that disrupts the service or ignores published technical controls.</li>
    </ul>
    <p>
      Ordinary sharing of a page link and good-faith indexing by public search engines remain permitted. Government
      notifications and other third-party material remain subject to the rights and terms of their respective owners.
    </p>

    <h2>6. Update requests and communications</h2>
    <p>
      A contact form must describe the purpose and communication channels before submission. You must provide accurate
      contact information that you are authorised to use. You can opt out of optional communications as described in
      the Privacy Policy. An alert is a convenience and is not a substitute for checking the official authority; we do
      not promise that every alert will be delivered or delivered before a deadline.
    </p>

    <h2>7. Third-party websites and services</h2>
    <p>
      A link does not give us control over the linked site's content, availability, security, fee collection or data
      practices. Check the domain and the official notification before entering data. We may remove or replace a link
      that is broken, compromised or misleading, but we do not assume responsibility for a third party's independent
      acts. This clause does not excuse our own fraud, wilful misconduct, gross negligence or a liability that law does
      not allow us to exclude.
    </p>

    <h2>8. Advertising and sponsored material</h2>
    <p>
      Pages may contain advertisements or sponsored placements. They should be labelled so a reasonable user can
      distinguish them from editorial information and an official application link. Advertisers are responsible for
      their offers. Appearance of an advertisement is not government affiliation, selection assurance or our guarantee
      of the advertiser. Please report an ad that impersonates an authority, promises a job for payment or hides
      material terms.
    </p>

    <h2>9. Intellectual property</h2>
    <p>
      Our original writing, selection, organisation, software, visual design and brand assets are protected by
      applicable law. Subject to these terms, we grant you a limited, revocable, non-exclusive right to use the public
      service for personal, non-commercial information purposes. This does not transfer ownership or restrict a right
      you independently have in a public document or under applicable law.
    </p>

    <h2>10. Availability and changes</h2>
    <p>
      We may maintain, secure, correct, improve, suspend or discontinue a feature. We may remove stale, duplicate,
      unlawful or unsafe material. We will not use this clause to alter an already completed transaction or remove a
      mandatory right retrospectively. Where reasonably possible, a material prospective change will be identified by
      an updated date or notice.
    </p>

    <h2>11. Disclaimers and liability</h2>
    <p>
      The service is provided for general information on an "as available" basis. To the maximum extent permitted by
      law, we do not warrant uninterrupted availability or that every summary is complete, current or error-free. We
      are not responsible for a recruiting authority's decision, schedule change, portal outage or independent act.
    </p>
    <p>
      To the maximum extent permitted by law, we are not liable for indirect, incidental, special or consequential loss
      that was not reasonably foreseeable and that results solely from reliance on an unverified summary or a third
      party's independent service. Nothing in these terms excludes or limits liability for fraud, wilful misconduct,
      gross negligence, breach of confidentiality caused by us, or any consumer, data-protection or other statutory
      right or remedy that cannot lawfully be excluded or limited.
    </p>

    <h2>12. Responsibility for misuse</h2>
    <p>
      You remain responsible for loss reasonably caused by your unlawful misuse of the service, infringement of
      another person's rights or deliberate breach of these terms. This does not make you responsible for our acts or
      for loss that you did not cause, and it applies only to the extent permitted by law.
    </p>

    <h2>13. Governing law and disputes</h2>
    <p>
      These terms are governed by the laws of India. Please contact us first so we can try to resolve a concern. Nothing
      here prevents either party from approaching a court, consumer commission, regulator, data-protection authority or
      other statutory forum that has jurisdiction under applicable law. Subject to any mandatory consumer or statutory
      forum, the competent courts at New Delhi will have jurisdiction. No clause requires you to waive a mandatory
      complaint, appeal or legal remedy.
    </p>

    <h2>14. General terms</h2>
    <p>
      If a provision is unenforceable, it will be limited only to the extent necessary and the remainder will continue
      to apply. A delay in enforcing a provision is not a permanent waiver. These terms, the Privacy Policy, Cookie
      Policy and any feature-specific notice form the applicable agreement for the service and do not create an agency,
      employment, recruitment or government relationship.
    </p>

    <h2>15. Contact</h2>
    <ContactBlock />
  </>
);

const disclaimer = (
  <>
    <h2>1. Independent private information portal</h2>
    <p>
      Sarkari DekhoCampus is a privately operated, independent information portal. It is not affiliated with, approved
      by, endorsed by or operated on behalf of the Government of India, a State Government, a ministry, department,
      commission, board, public authority, court, university, examination body or recruiting organisation. The word
      "Sarkari" describes the subject of the information and does not claim official status.
    </p>
    <p>
      We do not use the State Emblem of India or an official seal to suggest government authority. Names, marks and
      logos of recruiting bodies belong to their respective owners and are used, where necessary, only to identify the
      subject of an update. Such identification does not imply sponsorship.
    </p>

    <h2>2. Summary, not the official notification</h2>
    <p>
      We use reasonable editorial care, but a page may be incomplete, delayed, reformatted or mistaken. Government and
      recruiting authorities can issue a corrigendum, change a deadline, alter vacancies or eligibility, postpone an
      examination, withdraw a notice or move an application page after we publish. The current official notification,
      corrigendum and authority website prevail over every summary, headline, table, alert or answer on this service.
    </p>

    <h2>3. Verify before acting</h2>
    <p>
      Before applying, paying, travelling, resigning, preparing documents or relying on a result, verify directly with
      the responsible authority: the exact post and vacancy count; category, domicile and reservation rules; age and
      relaxation date; qualification and experience; fee and exemption; opening and closing time; examination centre;
      syllabus and selection process; required documents; result or answer key; and the official website address.
    </p>

    <h2>4. No eligibility, legal or career determination</h2>
    <p>
      Content is general information, not legal advice, an official eligibility decision, personalised recruitment
      advice or a representation that a role is suitable for you. Only the recruiting authority can interpret its
      notification and decide eligibility, acceptance, shortlisting, marks, ranking, selection and appointment.
    </p>

    <h2>5. No application fee or selection guarantee</h2>
    <p>
      Sarkari DekhoCampus cannot sell, reserve or guarantee a government job, admit card, examination result or place
      on a merit list. Unless a feature clearly and lawfully states otherwise, we do not collect a government
      application fee. Treat any request to pay DekhoCampus or an individual for guaranteed selection, leaked papers,
      expedited approval or a changed result as suspicious and report it.
    </p>

    <h2>6. External links</h2>
    <p>
      Links are provided to help users reach relevant pages. A linked website is controlled by its owner and may
      change, become unavailable or be compromised. Check the domain, HTTPS certificate and current official notice
      before entering credentials, uploading documents or paying. We welcome urgent reports of a broken, redirected,
      impersonating or unsafe link.
    </p>

    <h2>7. Advertisements</h2>
    <p>
      Advertising helps support the service. An advertisement or sponsored placement is not an official job notice,
      editorial endorsement or guarantee. It should be visibly distinguishable from editorial content and official
      action links. Any offer, claim, price, privacy practice and fulfilment is the advertiser's responsibility, subject
      to applicable law.
    </p>

    <h2>8. Alerts and availability</h2>
    <p>
      Email, call, SMS, WhatsApp, browser or other alerts are conveniences. Delivery can fail or arrive after an
      authority changes a deadline. Do not rely on an alert as your only monitoring method. Website access can also be
      interrupted by maintenance, security controls, network failure or a third-party outage.
    </p>

    <h2>9. Fair legal limits</h2>
    <p>
      To the maximum extent permitted by law, we do not accept responsibility for an authority's independent act or
      for indirect or consequential loss caused solely by reliance on information that the user did not verify against
      the official source. This disclaimer does not exclude responsibility for our own fraud, wilful misconduct, gross
      negligence or any duty, consumer right, privacy right or remedy that cannot lawfully be excluded.
    </p>

    <h2>10. Corrections and concerns</h2>
    <p>
      A disclaimer is not a substitute for correcting an error. Send the page URL, the exact statement or link at
      issue, the correction requested and supporting official material. Our review process is described in the
      <a href="/legal/editorial-corrections"> Editorial, Corrections and Takedown Policy</a>.
    </p>
    <ContactBlock />
  </>
);

const editorialCorrections = (
  <>
    <h2>1. Purpose</h2>
    <p>
      Our goal is to make time-sensitive public recruitment and examination information easier to find without
      obscuring the authority that controls it. Accuracy, clear independence, prompt correction and a visible boundary
      between editorial content and advertising guide this policy.
    </p>

    <h2>2. Source hierarchy</h2>
    <p>Editors should verify a job or examination item against the strongest available primary material:</p>
    <ol>
      <li>the issuing authority's current notification, corrigendum, result, answer key or official application page;</li>
      <li>an official gazette, official press release or verified communication from the responsible authority; and</li>
      <li>secondary reporting only as a discovery lead, never as the final authority for a deadline, fee, eligibility rule or application link.</li>
    </ol>
    <p>
      We write original summaries. Another portal's wording, branding, source claim or interpretation must not be
      copied or presented as our verification.
    </p>

    <h2>3. Pre-publication checklist</h2>
    <p>Before publication, the editor should check and record, as applicable:</p>
    <ul>
      <li>the issuing body, notification or advertisement number and date;</li>
      <li>post name, vacancy count and category breakdown;</li>
      <li>age calculation date, relaxations, qualification, experience, domicile and reservation conditions;</li>
      <li>application fee, exemptions, payment method and refund language stated by the authority;</li>
      <li>opening date, closing date and time, correction window, examination date and relevant time zone;</li>
      <li>selection stages, documents, official application URL and contact details; and</li>
      <li>whether a later corrigendum, cancellation, postponement or result has superseded the item.</li>
    </ul>
    <p>
      A page should show when it was last updated. Time-sensitive facts should be stated as the authority's published
      position, not as our guarantee. The official action link should be distinguished from an advertisement.
    </p>

    <h2>4. Automated and AI-assisted work</h2>
    <p>
      Software or AI may assist with discovery, extraction, translation, formatting, summaries or quality checks. We
      use risk-based controls that may combine automated validation, comparison with primary material, sampling and
      human editorial review. The level and timing of human review depends on source reliability, urgency, materiality
      and available evidence; not every item or field is necessarily reviewed by a person before publication.
      Higher-risk claims such as dates, eligibility, fees, vacancies and application links are prioritised for
      verification and correction. Automated output is not an authoritative source. We do not knowingly fabricate a
      vacancy, date, quotation, authority, link or eligibility rule, and synthetic media must not be presented as a
      genuine government document, person or event.
    </p>

    <h2>5. Editorial independence and advertising</h2>
    <p>
      Advertising, sponsorship, lead generation and editorial review must remain distinguishable. Payment does not
      convert an advertiser into a government authority, guarantee favourable editorial treatment or permit an ad to
      imitate an official notice or application button. Sponsored material must be labelled in language a reasonable
      mobile user can see before acting.
    </p>

    <h2>6. Corrections</h2>
    <p>
      We correct confirmed errors as soon as reasonably practicable. A spelling or formatting error that does not
      change meaning may be fixed without a separate note. A material correction, such as a changed deadline, fee,
      vacancy, eligibility rule or destination URL, should update the page date and include a concise correction or
      update note where that context would help users. A superseded item may remain available for the public record if
      it is clearly marked and directs users to the current update.
    </p>

    <h2>7. How to request a correction</h2>
    <p>Please send:</p>
    <ul>
      <li>the exact DekhoCampus page URL;</li>
      <li>the sentence, number, date, image or link you believe is wrong;</li>
      <li>the correction you request and why; and</li>
      <li>a current primary document or official URL that supports the request.</li>
    </ul>
    <p>
      We prioritise time-sensitive correction requests. Where mandatory publisher grievance rules apply, we will issue
      an acknowledgement within 24 hours and communicate a decision within 15 days. A shorter mandatory legal deadline
      controls. Complex questions may require verification with the authority; an acknowledgement is not acceptance of
      the requested change.
    </p>

    <h2>8. Urgent link and safety reports</h2>
    <p>
      Reports that an application link redirects to phishing, malware, impersonation or an unauthorised payment request
      receive priority triage. We may temporarily disable the link or place a warning while checking it. Send the page
      URL, destination URL, screenshots if safe, and the time observed. Never send us a password, OTP or full payment
      credential as evidence.
    </p>

    <h2>9. Takedown requests</h2>
    <p>We may remove, restrict or redact material where reasonably necessary because it:</p>
    <ul>
      <li>is unlawful, subject to a valid court or government direction, or creates a material safety or fraud risk;</li>
      <li>unnecessarily exposes personal information, credentials or sensitive documents;</li>
      <li>infringes copyright, trade mark or another right after a sufficiently supported notice;</li>
      <li>is materially false and cannot be corrected adequately; or</li>
      <li>is duplicated, corrupted, obsolete in a misleading way or outside the service's editorial scope.</li>
    </ul>
    <p>
      A request should identify the work or right, the exact URL and material, the requester's authority, the legal or
      factual basis, and reliable contact information. We may ask for proportionate verification and may seek a response
      from the author or rights holder. We do not promise removal merely because accurate public information is
      inconvenient or critical. We may preserve a restricted copy and review record where required for security,
      evidence, legal compliance or the defence of rights.
    </p>

    <h2>10. Complaints, review and escalation</h2>
    <p>
      The Privacy & Grievance Desk coordinates content complaints and privacy requests. A decision may correct, update,
      annotate, restrict, remove or retain the content, with a brief reason where appropriate. If a statutory appeal or
      self-regulatory escalation applies, the response will identify the available route; this policy does not remove a
      complainant's right to use a court, regulator or other forum having jurisdiction.
    </p>

    <h2>11. Contact</h2>
    <ContactBlock />
  </>
);

export const SARKARI_LEGAL_CONTENT: Record<SarkariLegalSlug, ReactNode> = {
  "privacy-policy": privacyPolicy,
  "cookie-policy": cookiePolicy,
  "terms-of-service": termsOfService,
  disclaimer,
  "editorial-corrections": editorialCorrections,
};
