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
        opacity: 1,
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

// ============================================
// TECHNOLOGY FORM
// ============================================

const techForm = document.querySelector("#tech-form");
const formMessage = document.querySelector("#form-message");

const listingPreview = document.querySelector("#listing-preview");

const previewName = document.querySelector("#preview-name");
const previewCategory = document.querySelector("#preview-category");
const previewDescription = document.querySelector("#preview-description");
const previewPrice = document.querySelector("#preview-price");
const previewCreator = document.querySelector("#preview-creator");
const previewImage = document.querySelector("#preview-image");

const categoryNames = {
    ai: "AI / ML",
    hardware: "Hardware",
    software: "Software",
    iot: "IoT / Web"
};


if (listingPreview) {
    listingPreview.style.display = "none";
}


if (techForm) {

    techForm.addEventListener("submit", (event) => {

        event.preventDefault();


        // Get form values

        const name =
            document.querySelector("#tech-name").value.trim();

        const category =
            document.querySelector("#tech-category").value;

        const description =
            document.querySelector("#tech-description").value.trim();

        const price =
            document.querySelector("#tech-price").value;

        const creator =
            document.querySelector("#tech-creator").value.trim();


        // Update preview

        previewName.textContent = name;

        previewCategory.textContent =
            categoryNames[category] || "TECHNOLOGY";

        previewDescription.textContent =
            description;

        previewPrice.textContent =
            `₹${Number(price).toLocaleString("en-IN")}`;

        previewCreator.textContent =
            creator;


        // Product visual

        if (category === "ai") {
            previewImage.textContent = "AI";
        } else if (category === "hardware") {
            previewImage.textContent = "HW";
        } else if (category === "software") {
            previewImage.textContent = "SW";
        } else {
            previewImage.textContent = "IOT";
        }


        // Show preview

        listingPreview.style.display = "block";


        // Animate preview

        gsap.fromTo(
            listingPreview,
            {
                opacity: 0,
                y: 30
            },
            {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power3.out"
            }
        );


        // Confirmation

        formMessage.textContent =
            "Your listing preview is ready.";

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

    });

}


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
// Keep navigation visible
gsap.set(".nav-links a", {
    opacity: 1,
    visibility: "visible"
});
// ============================================
// MARKETPLACE SEARCH & FILTER
// ============================================

const searchInput = document.querySelector("#product-search");
const filterButtons = document.querySelectorAll(".filter-btn");
const productCards = document.querySelectorAll(".product-card");

let activeCategory = "all";

function filterProducts() {

    const searchTerm = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    productCards.forEach((card) => {

        const category = card.dataset.category || "all";
        const text = card.textContent.toLowerCase();

        const matchesCategory =
            activeCategory === "all" ||
            category === activeCategory;

        const matchesSearch =
            text.includes(searchTerm);

        if (matchesCategory && matchesSearch) {

            card.classList.remove("hidden");

            gsap.fromTo(
                card,
                {
                    opacity: 0,
                    y: 20
                },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.4,
                    ease: "power2.out"
                }
            );

        } else {

            card.classList.add("hidden");

        }

    });

}


// ============================================
// CATEGORY BUTTONS
// ============================================

filterButtons.forEach((button) => {

    button.addEventListener("click", () => {

        filterButtons.forEach((btn) => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        activeCategory =
            button.dataset.category;

        filterProducts();

    });

});


// ============================================
// SEARCH
// ============================================

if (searchInput) {

    searchInput.addEventListener("input", () => {

        filterProducts();

    });

}
// ============================================
// PRODUCT DETAILS
// ============================================

const productDetails = document.querySelector("#product-details");
const backToMarketplace = document.querySelector("#back-to-marketplace");

const detailImage = document.querySelector("#detail-image");
const detailCategory = document.querySelector("#detail-category");
const detailName = document.querySelector("#detail-name");
const detailDescription = document.querySelector("#detail-description");
const detailCreator = document.querySelector("#detail-creator");
const detailPrice = document.querySelector("#detail-price");

const productData = {

    "NeuraVision AI": {
        category: "ARTIFICIAL INTELLIGENCE",
        description:
            "An intelligent AI platform designed to automate everyday workflows.",
        creator: "Origyn Labs",
        price: "₹2,499",
        image: "AI"
    },

    "RoboArm X1": {
        category: "HARDWARE",
        description:
            "A modular robotic arm built for automation and experimentation.",
        creator: "Origyn Robotics",
        price: "₹18,999",
        image: "HW"
    },

    "DevFlow": {
        category: "SOFTWARE",
        description:
            "A developer productivity tool designed to simplify modern workflows.",
        creator: "Origyn Software",
        price: "₹999",
        image: "SW"
    },

    "HomeSense": {
        category: "IOT",
        description:
            "Smart sensors that bring intelligent automation to your home.",
        creator: "Origyn Labs",
        price: "₹3,499",
        image: "IOT"
    },

    "VisionCore": {
        category: "MACHINE LEARNING",
        description:
            "A computer vision toolkit for developers and researchers.",
        creator: "Origyn AI",
        price: "₹4,999",
        image: "ML"
    },

    "CloudForge": {
        category: "WEB TECHNOLOGY",
        description:
            "Tools for building and deploying modern web applications faster.",
        creator: "Origyn Cloud",
        price: "₹1,499",
        image: "WEB"
    }

};


// ============================================
// VIEW PRODUCT BUTTONS
// ============================================

document.querySelectorAll(".product-bottom a").forEach((button) => {

    button.addEventListener("click", (event) => {

        event.preventDefault();

        const card = button.closest(".product-card");

        if (!card) return;

        const nameElement = card.querySelector("h3");

        if (!nameElement) return;

        const productName = nameElement.textContent.trim();

        const product = productData[productName];

        if (!product) return;


        // Update product details

        detailImage.textContent = product.image;
        detailCategory.textContent = product.category;
        detailName.textContent = productName;
        detailDescription.textContent = product.description;
        detailCreator.textContent = product.creator;
        detailPrice.textContent = product.price;


        // Hide marketplace

        document.querySelector("#discover").style.display = "none";


        // Show details

        productDetails.style.display = "flex";


        // Scroll to details

        productDetails.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


        // Animate details

        gsap.fromTo(
            ".product-detail-image",
            {
                x: -80,
                opacity: 0
            },
            {
                x: 0,
                opacity: 1,
                duration: 0.8,
                ease: "power3.out"
            }
        );


        gsap.fromTo(
            ".product-detail-info",
            {
                x: 80,
                opacity: 0
            },
            {
                x: 0,
                opacity: 1,
                duration: 0.8,
                ease: "power3.out"
            }
        );

    });

});


// ============================================
// BACK TO MARKETPLACE
// ============================================

if (backToMarketplace) {

    backToMarketplace.addEventListener("click", () => {

        productDetails.style.display = "none";

        document.querySelector("#discover").style.display = "block";

        document.querySelector("#discover").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        ScrollTrigger.refresh();

    });

}
