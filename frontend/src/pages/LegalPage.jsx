import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileText } from "lucide-react";
import { COLORS } from "../constants";

const LAST_UPDATED = "10 September 2026";

function LegalLayout({ title, eyebrow, icon: Icon, children }) {
  return (
    <div className="min-h-screen" style={{ background: COLORS.cream }}>
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{ background: 'rgba(42,24,16,0.96)' }}
      >
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5"
            aria-label="Back to KENJAV home"
          >
            <span
              className="rounded-md shrink-0"
              style={{
                width: 24,
                height: 24,
                background:
                  "linear-gradient(135deg, " + COLORS.marigoldLight + ", " + COLORS.flamingo + ")",
                transform: 'rotate(45deg)',
              }}
            />

            <span
              className="font-bold text-lg ff-display"
              style={{ color: COLORS.cream }}
            >
              KENJAV
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: COLORS.cream }}
          >
            <ArrowLeft size={16} />
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 sm:py-16">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: COLORS.espresso,
              color: COLORS.marigoldLight,
            }}
          >
            <Icon size={22} />
          </div>

          <div>
            <p
              className="text-xs font-bold tracking-widest"
              style={{ color: COLORS.eyebrow }}
            >
              {eyebrow}
            </p>

            <h1
              className="text-3xl sm:text-4xl font-bold ff-display"
              style={{ color: COLORS.ink }}
            >
              {title}
            </h1>
          </div>
        </div>

        <p
          className="text-sm mt-4"
          style={{ color: COLORS.muted }}
        >
          Last updated: {LAST_UPDATED}
        </p>

        <article className="mt-8 bg-white rounded-3xl shadow-sm p-6 sm:p-8 legal-content">
          {children}
        </article>

        <div className="flex flex-wrap gap-3 mt-6 text-sm font-semibold">
          <Link
            to="/privacy"
            className="px-4 py-2.5 rounded-full"
            style={{
              background: COLORS.espresso,
              color: COLORS.cream,
            }}
          >
            Privacy Policy
          </Link>

          <Link
            to="/terms"
            className="px-4 py-2.5 rounded-full"
            style={{
              background: COLORS.marigold,
              color: COLORS.espresso,
            }}
          >
            Terms of Service
          </Link>
        </div>
      </main>

      <footer
        className="px-5 py-8 text-center"
        style={{ background: COLORS.espressoDeep }}
      >
        <p
          className="text-xs"
          style={{ color: 'rgba(251,240,220,0.55)' }}
        >
          © {new Date().getFullYear()} KENJAV. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8 last:mb-0">
      <h2
        className="text-xl font-bold ff-display mb-3"
        style={{ color: COLORS.ink }}
      >
        {title}
      </h2>

      <div
        className="text-sm leading-7"
        style={{ color: COLORS.muted }}
      >
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   PRIVACY POLICY
========================================================= */

export function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      eyebrow="YOUR PRIVACY MATTERS"
      icon={ShieldCheck}
    >
      <Section title="1. Introduction">
        KENJAV respects your privacy and is committed to protecting
        the personal information of our customers, website visitors,
        wholesale customers, and other users of our services.

        This Privacy Policy explains what information KENJAV may
        collect, why we collect it, how we use it, when it may be
        shared, how we protect it, and the choices and rights available
        to you.

        By using the KENJAV website or placing an order, you acknowledge
        that you have read and understood this Privacy Policy.
      </Section>

      <Section title="2. Information We Collect">
        <p className="mb-3">
          Depending on how you interact with KENJAV, we may collect the
          following information:
        </p>

        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Identity information:</strong> your name or other
            information you provide when placing an order or contacting us.
          </li>

          <li>
            <strong>Contact information:</strong> your telephone number
            and, where provided, your email address.
          </li>

          <li>
            <strong>Delivery information:</strong> your delivery address,
            location details provided for delivery, and delivery notes.
          </li>

          <li>
            <strong>Order information:</strong> products ordered,
            quantities, order value, order code, order status, fulfillment
            method, and order history.
          </li>

          <li>
            <strong>Payment information:</strong> payment method,
            transaction status, and payment reference information
            necessary to confirm an order.
          </li>

          <li>
            <strong>Communication information:</strong> information you
            provide when contacting KENJAV about an order, complaint,
            question, or other service request.
          </li>

          <li>
            <strong>Marketing preferences:</strong> whether you have
            chosen to receive promotional communications.
          </li>

          <li>
            <strong>Technical information:</strong> information that may
            be automatically generated when accessing our website,
            including browser, device, network, and usage information
            where applicable.
          </li>
        </ul>
      </Section>

      <Section title="3. How We Use Personal Information">
        KENJAV may use your information to:

        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>receive and process your orders;</li>
          <li>prepare and fulfil food orders;</li>
          <li>arrange pickup or delivery;</li>
          <li>contact you regarding your order;</li>
          <li>confirm and reconcile payments;</li>
          <li>provide customer support;</li>
          <li>respond to questions, complaints, and requests;</li>
          <li>maintain transaction and business records;</li>
          <li>prevent fraud, abuse, unauthorized access, or misuse;</li>
          <li>improve our website, products, and services;</li>
          <li>manage wholesale or business customer relationships;</li>
          <li>send promotional communications where you have opted in;</li>
          <li>comply with applicable legal and regulatory requirements.</li>
        </ul>
      </Section>

      <Section title="4. Orders and Customer Information">
        When you place an order through KENJAV, we use the information
        you provide to process and fulfil that order.

        This may include your name, telephone number, email address,
        delivery address, order details, payment method, and special
        instructions.

        You are responsible for ensuring that the information you
        provide is accurate and belongs to you or that you are
        authorized to provide it.
      </Section>

      <Section title="5. M-Pesa and Other Payments">
        KENJAV may provide M-Pesa and other supported payment options.

        Payment processing may involve third-party payment or financial
        service providers. Information required to confirm a payment
        may be exchanged with the relevant provider.

        <strong>
          KENJAV will never ask you to provide your M-Pesa PIN,
          banking password, or other confidential payment credentials
          through the website or through ordinary customer support.
        </strong>

        Never disclose your M-Pesa PIN to another person.
      </Section>

      <Section title="6. Sharing Personal Information">
        KENJAV does not sell your personal information as a product.

        We may share limited information with trusted service providers
        where necessary to operate our business and provide services to
        you. These may include:

        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>payment and financial service providers;</li>
          <li>hosting and technology providers;</li>
          <li>delivery or logistics providers;</li>
          <li>communication service providers;</li>
          <li>professional advisers where necessary;</li>
          <li>government, regulatory, or law-enforcement authorities where
              legally required.</li>
        </ul>

        We aim to limit information shared with third parties to what
        is reasonably necessary for the relevant purpose.
      </Section>

      <Section title="7. Marketing Communications">
        KENJAV may offer customers the opportunity to receive
        promotional messages, offers, product updates, or other
        marketing communications.

        Marketing communications are optional.

        You may withdraw your marketing preference or request that
        promotional communications stop.

        Please note that transactional communications, such as
        information necessary to process or support an order, may still
        be sent even if you opt out of marketing.
      </Section>

      <Section title="8. Cookies and Website Technologies">
        KENJAV may use cookies, browser storage, or similar technologies
        where necessary to operate the website, remember preferences,
        maintain functionality, improve the user experience, or
        understand how the website is used.

        Some technologies may be provided by third-party services used
        by the website.

        You may be able to control cookies through your browser settings.
        Disabling certain cookies or browser storage may affect some
        website functionality.
      </Section>

      <Section title="9. Data Security">
        KENJAV takes reasonable technical and organizational measures
        to protect personal information against unauthorized access,
        loss, misuse, alteration, or disclosure.

        However, no internet transmission, computer system, or storage
        system can be guaranteed to be completely secure.

        You should also take reasonable steps to protect your own
        devices, passwords, accounts, and payment credentials.
      </Section>

      <Section title="10. Data Retention">
        We retain personal information for as long as reasonably
        necessary for the purposes described in this policy.

        This may include retaining information for order processing,
        accounting, financial records, customer service, dispute
        resolution, security, fraud prevention, and legal or regulatory
        obligations.

        When information is no longer reasonably required, we may
        delete, anonymize, or securely dispose of it where appropriate.
      </Section>

      <Section title="11. Your Privacy Rights">
        Subject to applicable law and lawful limitations, you may have
        rights concerning your personal information, including the
        ability to:

        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>request access to personal information held about you;</li>
          <li>request correction of inaccurate or incomplete information;</li>
          <li>ask questions about how your information is being used;</li>
          <li>withdraw consent where processing is based on consent;</li>
          <li>object to certain uses of your information where applicable;</li>
          <li>make a complaint to the appropriate data-protection authority
              where you believe your rights have been violated.</li>
        </ul>

        We may need to verify your identity before processing a privacy
        request.
      </Section>

      <Section title="12. Children's Privacy">
        KENJAV's online ordering service is intended for users who are
        legally able to enter into transactions.

        We do not knowingly seek to collect unnecessary personal
        information from children.

        If you believe a child has provided personal information to us
        without appropriate authorization, please contact KENJAV so that
        the matter can be reviewed.
      </Section>

      <Section title="13. Third-Party Websites and Services">
        Our website or communications may contain links to or rely on
        services operated by third parties.

        Third-party services may have their own privacy policies and
        terms. KENJAV is not responsible for the privacy practices of
        independent third-party services outside our control.

        You should review the applicable third-party terms and privacy
        notices when using those services.
      </Section>

      <Section title="14. Changes to This Privacy Policy">
        KENJAV may update this Privacy Policy from time to time to
        reflect changes to our services, technology, business
        practices, or applicable legal requirements.

        The updated version will be published on this page together
        with a revised "Last updated" date.

        You should review this page periodically for changes.
      </Section>

      <Section title="15. Contact Us">
        If you have a question, concern, privacy request, or complaint
        concerning the handling of your personal information, please
        contact KENJAV using the customer contact information provided
        on our website.

        We may request additional information to verify your identity
        before responding to a privacy request.
      </Section>
    </LegalLayout>
  );
}

/* =========================================================
   TERMS OF SERVICE
========================================================= */

export function TermsOfService() {
  return (
    <LegalLayout
      title="Terms of Service"
      eyebrow="PLEASE READ"
      icon={FileText}
    >
      <Section title="1. Introduction">
        These Terms of Service govern your use of the KENJAV website,
        online ordering service, and related services.

        By accessing the website, submitting an order, or otherwise
        using the KENJAV online service, you agree to these Terms.

        If you do not agree with these Terms, please do not use the
        online ordering service.
      </Section>

      <Section title="2. About KENJAV">
        KENJAV provides food products and related services, including
        online ordering for available products and, where offered,
        pickup, delivery, and wholesale services.

        Product availability, prices, delivery options, and operating
        arrangements may change from time to time.
      </Section>

      <Section title="3. Eligibility and Responsible Use">
        You agree to use the KENJAV website for lawful purposes.

        You must provide accurate information when placing an order or
        using a KENJAV service.

        You must not:

        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>use the website for unlawful purposes;</li>
          <li>submit false, fraudulent, or misleading information;</li>
          <li>attempt to gain unauthorized access to KENJAV systems;</li>
          <li>interfere with the operation or security of the website;</li>
          <li>introduce malicious software or harmful code;</li>
          <li>use automated methods to abuse or overload the service;</li>
          <li>misuse another person's account or information.</li>
        </ul>
      </Section>

      <Section title="4. Placing an Order">
        When you submit an order, you are making a request to purchase
        the selected products.

        An order is subject to product availability, accurate customer
        information, payment confirmation where applicable, and
        acceptance by KENJAV.

        KENJAV may contact you if information is incomplete, an item is
        unavailable, payment cannot be confirmed, or an issue affects
        fulfilment of the order.
      </Section>

      <Section title="5. Product Availability">
        We make reasonable efforts to ensure that products displayed
        online are accurately described and available.

        However, availability may change before or after an order is
        submitted.

        If an ordered product becomes unavailable, KENJAV may contact
        you to discuss an alternative, adjustment, cancellation, or
        other appropriate resolution.
      </Section>

      <Section title="6. Prices">
        Prices displayed on the KENJAV website are normally shown in
        Kenyan Shillings (KES).

        Prices may change from time to time.

        The applicable price for an order is the price presented during
        the applicable ordering process, subject to correction of
        obvious errors and any applicable charges communicated to you.
      </Section>

      <Section title="7. Payment">
        KENJAV may support payment methods such as cash and M-Pesa,
        depending on the ordering and fulfillment option available.

        Where electronic payment is selected, the order may require
        successful payment confirmation before it is treated as paid.

        You are responsible for providing accurate payment information
        and completing payment through the supported payment process.

        KENJAV will not ask you for your M-Pesa PIN.
      </Section>

      <Section title="8. Pickup and Delivery">
        Customers may be offered pickup or delivery depending on the
        service available at the time of ordering.

        Delivery times displayed or communicated by KENJAV are
        estimates and may be affected by traffic, weather, order
        volume, product preparation, location, availability, or other
        circumstances.

        For delivery orders, you are responsible for providing a
        complete and accurate delivery address and being reasonably
        available to receive the order.

        Additional delivery conditions or charges may apply where
        communicated before an order is confirmed.
      </Section>

      <Section title="9. Food, Ingredients, Allergies and Dietary Requirements">
        KENJAV aims to provide accurate product and ingredient
        information. However, ingredients and preparation methods may
        change.

        Food products may contain or come into contact with common
        allergens.

        If you have an allergy, intolerance, medical dietary requirement,
        or other food-related concern, you should contact KENJAV before
        ordering and provide the relevant information.

        KENJAV cannot guarantee an allergen-free preparation environment
        unless expressly stated.
      </Section>

      <Section title="10. Order Changes and Cancellations">
        If you need to change or cancel an order, contact KENJAV as
        soon as possible.

        Changes or cancellations may not be possible once preparation,
        packaging, delivery, or another fulfilment process has begun.

        Any refund, replacement, cancellation, or other resolution will
        depend on the circumstances and applicable law.
      </Section>

      <Section title="11. Problems With an Order">
        If an order is incorrect, damaged, incomplete, or otherwise
        affected by a fulfilment problem, contact KENJAV as soon as
        reasonably possible.

        Where appropriate, we may request your order code, photographs,
        payment information, or other details necessary to investigate
        the issue.

        Depending on the circumstances, KENJAV may offer a correction,
        replacement, refund, credit, or another appropriate remedy.
      </Section>

      <Section title="12. Wholesale Services">
        KENJAV may provide wholesale ordering and account services to
        approved business customers or shopkeepers.

        Wholesale customers may be subject to additional pricing,
        payment, ordering, account, credit, delivery, or stock
        conditions.

        Wholesale accounts must be used only by authorized persons.

        KENJAV may suspend or deactivate a wholesale account where
        necessary to protect the business, customers, systems, or
        applicable legal requirements.
      </Section>

      <Section title="13. Accounts and Security">
        Certain KENJAV services may require an account or authentication.

        You are responsible for keeping your login credentials
        confidential and for activities carried out through your
        account.

        You should notify KENJAV if you believe that your account has
        been accessed without authorization.

        KENJAV may restrict or suspend access where necessary to protect
        users, the business, or the security of its systems.
      </Section>

      <Section title="14. Website Availability">
        We aim to keep the KENJAV website available and functional, but
        we do not guarantee uninterrupted or error-free availability.

        The service may occasionally be unavailable because of
        maintenance, technical problems, internet connectivity,
        third-party services, or circumstances outside KENJAV's
        reasonable control.
      </Section>

      <Section title="15. Intellectual Property">
        Unless otherwise stated, content appearing on the KENJAV
        website, including branding, logos, text, graphics, images,
        product descriptions, design elements, and software, belongs to
        KENJAV or its relevant licensors.

        You may access and use the website for legitimate personal or
        business purposes consistent with these Terms.

        You must not reproduce, modify, distribute, sell, or commercially
        exploit protected KENJAV content without appropriate
        authorization.
      </Section>

      <Section title="16. Third-Party Services">
        KENJAV may use third-party services to support functions such as
        payment processing, hosting, communications, analytics,
        delivery, or other technology.

        Third-party services may have separate terms and privacy
        policies.

        KENJAV is not responsible for independent third-party services
        that are outside its reasonable control.
      </Section>

      <Section title="17. Limitation of Liability">
        KENJAV will provide its services with reasonable care and in
        accordance with applicable law.

        To the extent permitted by law, KENJAV is not responsible for
        losses caused by circumstances outside its reasonable control,
        including interruptions to third-party services, internet
        failures, inaccurate information supplied by a customer,
        delays caused by circumstances beyond KENJAV's control, or
        unauthorized access resulting from a customer's failure to
        protect their own credentials.

        Nothing in these Terms excludes or limits any liability,
        consumer right, or remedy that cannot lawfully be excluded or
        limited.
      </Section>

      <Section title="18. Suspension or Termination">
        KENJAV may restrict, suspend, or terminate access to parts of
        the website or services where reasonably necessary, including
        in cases of suspected fraud, misuse, unauthorized access,
        security threats, violation of these Terms, or legal
        requirements.

        Termination does not remove rights or obligations that arose
        before termination.
      </Section>

      <Section title="19. Changes to These Terms">
        KENJAV may update these Terms from time to time to reflect
        changes to our services, business practices, technology, or
        applicable law.

        Updated Terms will be published on this page with a revised
        "Last updated" date.

        Your continued use of the website after updated Terms become
        effective constitutes acceptance of the updated Terms to the
        extent permitted by law.
      </Section>

      <Section title="20. Applicable Law">
        These Terms are intended to operate in accordance with the laws
        applicable in Kenya.

        Nothing in these Terms is intended to remove or reduce any
        mandatory consumer, privacy, or other legal protection that
        applies to you.
      </Section>

      <Section title="21. Contact">
        If you have questions concerning these Terms, an order, a
        product, payment, delivery, or another KENJAV service, please
        contact KENJAV using the customer contact information provided
        on the website.
      </Section>
    </LegalLayout>
  );
}
