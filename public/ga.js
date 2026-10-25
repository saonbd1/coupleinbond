/* Google Analytics 4 (gtag.js) for couplein.bond.
 *
 * Single source of truth for the Measurement ID: every page loads this file
 * from the <head> instead of repeating the gtag snippet inline.
 *
 * While MEASUREMENT_ID is still the placeholder, the script exits early and
 * sends no hits, so a deploy can never pollute a property by accident.
 */
(function () {
  var MEASUREMENT_ID = 'G-GWG6H60G37';

  if (!MEASUREMENT_ID || MEASUREMENT_ID.indexOf('XXXXXXXXXX') !== -1) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID);

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(script);
})();
