const intro = gsap.timeline();

intro
    .from(".logo", {
        y: -30,
        opacity: 0,
        duration: 1
    })
    .from("#home h1", {
        y: 80,
        opacity: 0,
        duration: 1
    })
    .from("#home p", {
        y: 40,
        opacity: 0,
        duration: 0.8
    });


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
const cardTimeline = gsap.timeline({
    scrollTrigger: {
        trigger: ".product-grid",
        start: "top 80%",
        toggleActions: "play none none reverse"
    }
});

cardTimeline
    .from(".product-card", {
        y: 100,
        opacity: 0,
        duration: 0.8,
        stagger: 0.5,
        ease: "power3.out"
    }); 
const storyScene = document.querySelector("#story");

ScrollTrigger.create({
    trigger: "#story",
    start: "top top",
    end: "+=2000",
    pin: true
});
gsap.to(".delivery-man", {
    x: 500,

    scrollTrigger: {
        trigger: "#story",
        start: "top top",
        end: "+=2000",
        scrub: 1
    }
});
gsap.to(".delivery-box", {
    x: 500,

    scrollTrigger: {
        trigger: "#story",
        start: "top top",
        end: "+=2000",
        scrub: 1
    }
});
const walking = gsap.timeline({
    repeat: -1,
    paused: true
});
ScrollTrigger.create({
    trigger: "#story",
    start: "top top",
    end: "+=2000",

    onEnter: () => walking.play(),
    onLeave: () => walking.pause(),
    onEnterBack: () => walking.play(),
    onLeaveBack: () => walking.pause()
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
gsap.from(".nav-links a", {
    y: -20,
    opacity: 0,
    duration: 0.6,
    stagger: 0.1,
    delay: 0.5,
    ease: "power3.out"
});