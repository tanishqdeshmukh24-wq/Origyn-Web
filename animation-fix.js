/* Origyn animation timing + navigation visibility patch */
document.addEventListener("DOMContentLoaded", () => {
    const start = () => {
        if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
        gsap.registerPlugin(ScrollTrigger);

        const navStyle = document.createElement("style");
        navStyle.textContent = `
            .nav-links,
            .nav-links a,
            .nav-links button,
            #favorites-nav,
            #cart-nav {
                opacity: 1 !important;
                visibility: visible !important;
            }
        `;
        document.head.appendChild(navStyle);
        gsap.set(".nav-links, .nav-links a, .nav-links button", { opacity:1, visibility:"visible", clearProps:"transform" });

        /* Remove only the old Story ScrollTriggers. Other site animations remain untouched. */
        ScrollTrigger.getAll().forEach(t => {
            if (t.trigger && t.trigger.id === "story") t.kill();
        });

        const storyEl = document.querySelector("#story");
        const man = document.querySelector(".delivery-man");
        const box = document.querySelector(".delivery-box");
        const rock = document.querySelector(".rock");
        const tech = document.querySelectorAll(".tech-item");
        if (!storyEl || !man || !box || !rock || !tech.length) return;

        gsap.set(man, { x:-150, y:0, rotation:0, opacity:1 });
        gsap.set(box, { x:0, y:0, rotation:0, scale:1, opacity:1 });
        gsap.set(rock, { x:80, opacity:1 });
        gsap.set(tech, { y:55, opacity:0, scale:.75 });

        /* One scrubbed timeline keeps the sequence synchronized:
           walk -> collision -> box reaction -> tech reveal. */
        const story = gsap.timeline({
            defaults:{ ease:"none" },
            scrollTrigger:{
                trigger:storyEl,
                start:"top top",
                end:"+=2400",
                scrub:1.15,
                pin:true,
                anticipatePin:1,
                invalidateOnRefresh:true
            }
        });

        story.to(man, { x:0, duration:2.2, ease:"power1.inOut" });
        story.to(man, { x:22, rotation:-10, duration:.2, ease:"power2.out" })
             .to(man, { x:8, y:16, rotation:9, duration:.2, ease:"power2.inOut" })
             .to(man, { x:0, y:0, rotation:0, duration:.3, ease:"back.out(1.5)" });

        story.to(box, { x:500, rotation:-14, scale:1.12, duration:1, ease:"power2.inOut" }, ">+.2")
             .to(box, { rotation:12, scale:1, duration:.3, ease:"power2.inOut" })
             .to(box, { rotation:0, duration:.2 });

        story.to(tech, { y:0, opacity:1, scale:1, duration:.5, stagger:.35, ease:"back.out(1.7)" }, ">+.15");

        ScrollTrigger.refresh();
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once:true });
});
