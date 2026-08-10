gsap.registerPlugin(ScrollTrigger);


// ==============================
// HERO INTRO
// ==============================

const intro = gsap.timeline();

intro
    .from(".logo", {
        y: -30,
        opacity: 0,
        duration: 1,
        ease: "power3.out"
    })

    .from(".nav-links a", {
        y: -20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out"
    }, "-=0.5")

    .from("#home h1", {
        y: 80,
        opacity: 0,
        duration: 1,
        ease: "power3.out"
    })

    .from("#home p", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
    });


// ==============================
// HERO BUTTON ANIMATIONS
// ==============================

gsap.fromTo(
    "#explore-btn",
    {
        y: 30,
        opacity: 0
    },
    {
        y: 0,
        opacity: 1,
        duration: 0.8,
        delay: 1.8,
        ease: "power3.out"
    }
);

gsap.fromTo(
    "#sell-btn",
    {
        y: 30,
        opacity: 0
    },
    {
        y: 0,
        opacity: 1,
        duration: 0.8,
        delay: 2,
        ease: "power3.out"
    }
);


// ==============================
// DISCOVER HEADING
// ==============================

gsap.from("#discover .section-heading", {
    y: 100,
    opacity: 0,
    duration: 1,

    scrollTrigger: {
        trigger: "#discover",
        start: "top 80%",
        toggleActions: "play none none reverse"
    }
});


// ==============================
// PRODUCT CARDS
// ==============================

const cardTimeline = gsap.timeline({
    scrollTrigger: {
        trigger: ".product-grid",
        start: "top 80%",
        toggleActions: "play none none reverse"
    }
});

cardTimeline.from(".product-card", {
    y: 100,
    opacity: 0,
    duration: 0.8,
    stagger: 0.5,
    ease: "power3.out"
});


// ==============================
// DISCOVER CARDS
// ==============================
// IMPORTANT:
// Only opacity is animated.
// This prevents Chrome from messing
// with the grid alignment.
// ==============================

gsap.from(".discover-card", {
    opacity: 0,
    duration: 0.7,
    stagger: 0.2,
    ease: "power3.out",

    scrollTrigger: {
        trigger: "#discover",
        start: "top 70%",
        toggleActions: "play none none reverse"
    }
});


// ==============================
// STORY SCENE
// ==============================

const storyScene = document.querySelector("#story");


// ==============================
// PIN STORY SECTION
// ==============================

ScrollTrigger.create({
    trigger: "#story",
    start: "top top",
    end: "+=2000",
    pin: true
});


// ==============================
// DELIVERY MAN MOVEMENT
// ==============================

gsap.to(".delivery-man", {
    x: 500,

    scrollTrigger: {
        trigger: "#story",
        start: "top top",
        end: "+=2000",
        scrub: 1
    }
});


// ==============================
// DELIVERY BOX MOVEMENT
// ==============================

gsap.to(".delivery-box", {
    x: 500,

    scrollTrigger: {
        trigger: "#story",
        start: "top top",
        end: "+=2000",
        scrub: 1
    }
});


// ==============================
// WALKING ANIMATION
// ==============================

const walking = gsap.timeline({
    repeat: -1,
    paused: true
});

walking
    .to(".delivery-man", {
        y: -8,
        rotation: 3,
        duration: 0.25,
        ease: "power1.inOut"
    })

    .to(".delivery-man", {
        y: 0,
        rotation: -3,
        duration: 0.25,
        ease: "power1.inOut"
    });


// ==============================
// START / STOP WALKING
// ==============================

ScrollTrigger.create({
    trigger: "#story",
    start: "top top",
    end: "+=2000",

    onEnter: () => walking.play(),
    onLeave: () => walking.pause(),
    onEnterBack: () => walking.play(),
    onLeaveBack: () => walking.pause()
});


// ==============================
// ROCK COLLISION
// ==============================

const collision = gsap.timeline({
    paused: true
});

collision
    .to(".delivery-man", {
        rotation: -8,
        x: "+=20",
        duration: 0.2
    })

    .to(".delivery-man", {
        rotation: 8,
        x: "-=10",
        duration: 0.2
    })

    .to(".delivery-man", {
        rotation: -15,
        y: 25,
        duration: 0.25
    });


// ==============================
// TRIGGER COLLISION
// ==============================

ScrollTrigger.create({
    trigger: "#story",
    start: "top top",
    end: "+=2000",

    onUpdate: (self) => {

        if (self.progress > 0.45) {
            walking.pause();
            collision.play();
        }

    }
});


// ==============================
// BOX OPENING
// ==============================

const boxOpen = gsap.timeline({
    paused: true
});

boxOpen
    .to(".delivery-box", {
        rotation: -15,
        scale: 1.15,
        duration: 0.25,
        ease: "power2.out"
    })

    .to(".delivery-box", {
        rotation: 15,
        scale: 1,
        duration: 0.25,
        ease: "power2.inOut"
    });


// ==============================
// TRIGGER BOX OPENING
// ==============================

ScrollTrigger.create({
    trigger: "#story",
    start: "top top",
    end: "+=2000",

    onUpdate: (self) => {

        if (self.progress > 0.70) {
            boxOpen.play();
        }

    }
});


// ==============================
// TECHNOLOGY REVEAL
// ==============================

const techReveal = gsap.timeline({
    paused: true
});

techReveal.fromTo(
    ".tech-item",
    {
        y: 40,
        opacity: 0,
        scale: 0.8
    },

    {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.6,
        stagger: 0.2,
        ease: "back.out(1.7)"
    }
);


// ==============================
// TRIGGER TECHNOLOGY REVEAL
// ==============================

ScrollTrigger.create({
    trigger: "#story",
    start: "top top",
    end: "+=2000",

    onUpdate: (self) => {

        if (self.progress > 0.82) {
            techReveal.play();
        }

    }
});


// ==============================
// SELL SECTION
// ==============================

gsap.from(".sell-content", {
    x: -50,
    opacity: 0,
    duration: 0.8,
    ease: "power3.out",

    scrollTrigger: {
        trigger: "#sell",
        start: "top 70%",
        toggleActions: "play none none reverse"
    }
});


gsap.from(".sell-step", {
    opacity: 0,
    duration: 0.7,
    stagger: 0.2,
    ease: "power3.out",

    scrollTrigger: {
        trigger: ".sell-steps",
        start: "top 75%",
        toggleActions: "play none none reverse"
    }
});


// ==============================
// START SELLING BUTTON
// ==============================

document.querySelector("#start-selling-btn").addEventListener("click", () => {

    document.querySelector("#submit-tech").scrollIntoView({
        behavior: "smooth"
    });

});


// ==============================
// TECHNOLOGY FORM
// ==============================

const techForm = document.querySelector("#tech-form");
const formMessage = document.querySelector("#form-message");

techForm.addEventListener("submit", (event) => {

    event.preventDefault();

    formMessage.textContent =
        "Your technology has been submitted to Origyn.";

    gsap.fromTo(
        formMessage,
        {
            y: 10,
            opacity: 0
        },

        {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: "power3.out"
        }
    );

    techForm.reset();

});


// ==============================
// CONTACT SECTION
// ==============================

gsap.from(".contact-content", {
    y: 80,
    opacity: 0,
    duration: 1,
    ease: "power3.out",

    scrollTrigger: {
        trigger: "#contact",
        start: "top 75%",
        toggleActions: "play none none reverse"
    }
});


// ==============================
// ABOUT SECTION
// ==============================

const aboutTimeline = gsap.timeline({
    scrollTrigger: {
        trigger: "#about",
        start: "top 70%",
        toggleActions: "play none none reverse"
    }
});

aboutTimeline
    .from(".about-heading", {
        x: -70,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
    })

    .from(".about-text", {
        y: 50,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out"
    }, "-=0.4")

    .from(".about-stat", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        stagger: 0.2,
        ease: "power3.out"
    }, "-=0.3");


// ==============================
// SMOOTH NAVIGATION
// ==============================

document.querySelectorAll(".nav-links a").forEach((link) => {

    link.addEventListener("click", (event) => {

        const targetId = link.getAttribute("href");

        if (targetId.startsWith("#")) {

            event.preventDefault();

            const target = document.querySelector(targetId);

            if (target) {

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        }

    });

});


// ==============================
// HERO BUTTONS
// ==============================

document.querySelector("#explore-btn").addEventListener("click", () => {

    document.querySelector("#discover").scrollIntoView({
        behavior: "smooth"
    });

});


document.querySelector("#sell-btn").addEventListener("click", () => {

    document.querySelector("#sell").scrollIntoView({
        behavior: "smooth"
    });

});