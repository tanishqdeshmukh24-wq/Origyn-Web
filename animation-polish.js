/* ORIGYN — presentation-only animation layer
   Does not touch marketplace/cart/checkout/listing logic. */
(() => {
  function boot() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.getAll().forEach(t => t.kill());
    gsap.killTweensOf("*");
    gsap.set("header, .nav-links, .nav-links a, .nav-links button, .hero-buttons, .hero-buttons button", { clearProps: "all" });

    const reveal = (targets, vars = {}) => {
      const els = gsap.utils.toArray(targets);
      if (!els.length) return;
      gsap.fromTo(els,
        { autoAlpha: 0, y: vars.y ?? 42, x: vars.x ?? 0, scale: vars.scale ?? 0.98, rotateX: vars.rotateX ?? 0 },
        { autoAlpha: 1, y: 0, x: 0, scale: 1, rotateX: 0, duration: vars.duration ?? 0.8, ease: vars.ease ?? "power3.out", stagger: vars.stagger ?? 0.1,
          scrollTrigger: { trigger: vars.trigger || els[0], start: vars.start || "top 82%", once: true } }
      );
    };

    const hero = gsap.timeline({ defaults: { ease: "power4.out" } });
    hero.from(".logo", { y: -24, autoAlpha: 0, duration: 0.65 })
      .from(".nav-links a, .nav-links button", { y: -16, autoAlpha: 0, duration: 0.45, stagger: 0.06 }, "-=0.35")
      .from("#home h1", { y: 70, autoAlpha: 0, scale: 0.96, duration: 1.05 }, "-=0.15")
      .from("#home > p", { y: 28, autoAlpha: 0, duration: 0.65 }, "-=0.5")
      .from(".hero-buttons button", { y: 28, autoAlpha: 0, scale: 0.92, duration: 0.55, stagger: 0.1 }, "-=0.35");

    const discoverHeading = document.querySelector("#discover .section-heading");
    if (discoverHeading) {
      const tl = gsap.timeline({ scrollTrigger: { trigger: discoverHeading, start: "top 78%", once: true } });
      tl.from(discoverHeading.querySelector(".section-label"), { x: -30, autoAlpha: 0, duration: 0.5, ease: "power3.out" })
        .from(discoverHeading.querySelector("h2"), { y: 65, autoAlpha: 0, scale: 0.94, duration: 0.9, ease: "power4.out" }, "-=0.2")
        .from(discoverHeading.querySelector(":scope > p:last-child"), { y: 24, autoAlpha: 0, duration: 0.55, ease: "power3.out" }, "-=0.45");
    }

    reveal(".marketplace-controls", { y: 28, duration: 0.65, trigger: "#discover .marketplace-controls", start: "top 86%" });
    reveal(".product-card", { y: 65, scale: 0.94, duration: 0.72, stagger: 0.1, trigger: ".product-grid", start: "top 84%" });

    document.querySelectorAll(".product-card").forEach(card => {
      card.addEventListener("mouseenter", () => gsap.to(card, { y: -8, scale: 1.012, duration: 0.28, ease: "power2.out", overwrite: true }));
      card.addEventListener("mouseleave", () => gsap.to(card, { y: 0, scale: 1, duration: 0.35, ease: "power3.out", overwrite: true }));
    });

    const story = document.querySelector("#story");
    if (story) {
      const tl = gsap.timeline({ scrollTrigger: { trigger: story, start: "top 70%", once: true } });
      tl.from("#story .section-label", { x: -35, autoAlpha: 0, duration: 0.55, ease: "power3.out" })
        .from("#story h2", { y: 70, autoAlpha: 0, duration: 0.9, ease: "power4.out" }, "-=0.2")
        .from(".delivery-man", { x: -180, rotation: -12, autoAlpha: 0, duration: 1.2, ease: "power2.out" }, "-=0.1")
        .to(".delivery-man", { x: 18, rotation: 7, duration: 0.18, ease: "power2.inOut" })
        .to(".delivery-man", { x: 0, rotation: 0, duration: 0.25, ease: "back.out(1.7)" })
        .from(".delivery-box", { x: -35, autoAlpha: 0, scale: 0.8, duration: 0.5, ease: "back.out(1.6)" }, "-=0.35")
        .to(".delivery-box", { x: 260, rotation: -10, duration: 0.65, ease: "power2.inOut" })
        .to(".delivery-box", { rotation: 5, duration: 0.14 })
        .to(".delivery-box", { rotation: 0, duration: 0.14 })
        .from(".rock", { x: 30, autoAlpha: 0, scale: 0.7, duration: 0.4, ease: "back.out(1.6)" }, "-=0.35")
        .from(".tech-item", { y: 55, scale: 0.72, autoAlpha: 0, duration: 0.5, stagger: 0.14, ease: "back.out(1.7)" }, "-=0.2");
    }

    reveal("#sell .section-label, #sell h2, #sell .sell-content > p:not(.section-label), #start-selling-btn", { y: 45, duration: 0.7, stagger: 0.12, trigger: "#sell", start: "top 76%" });
    reveal(".sell-step", { y: 55, duration: 0.65, stagger: 0.14, trigger: ".sell-steps", start: "top 82%" });
    reveal("#submit-tech .submit-header .section-label, #submit-tech .submit-header h2, #submit-tech .submit-intro", { y: 50, duration: 0.72, stagger: 0.12, trigger: "#submit-tech", start: "top 78%" });
    reveal(".listing-form-panel", { x: -55, y: 0, scale: 0.98, duration: 0.85, trigger: ".listing-workspace", start: "top 80%" });
    reveal(".listing-preview-panel", { x: 55, y: 0, scale: 0.98, duration: 0.85, trigger: ".listing-workspace", start: "top 80%" });
    reveal(".listing-form-panel .form-group", { y: 22, duration: 0.45, stagger: 0.08, trigger: ".listing-form-panel", start: "top 75%" });
    reveal(".listing-process .process-step", { y: 30, duration: 0.55, stagger: 0.12, trigger: ".listing-process", start: "top 84%" });
    reveal("#about .about-heading .section-label, #about .about-heading h2", { x: -45, y: 0, duration: 0.75, stagger: 0.12, trigger: "#about", start: "top 78%" });
    reveal(".about-text p", { y: 32, duration: 0.6, stagger: 0.12, trigger: ".about-text", start: "top 82%" });
    reveal(".about-stat", { y: 42, duration: 0.6, stagger: 0.12, trigger: ".about-stats", start: "top 84%" });
    reveal("#contact .section-label, #contact h2, #contact p, #contact .contact-button", { y: 40, duration: 0.65, stagger: 0.11, trigger: "#contact", start: "top 80%" });
    reveal("footer", { y: 20, duration: 0.5, trigger: "footer", start: "top 92%" });

    ScrollTrigger.refresh();
  }

  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot, { once: true });
})();
